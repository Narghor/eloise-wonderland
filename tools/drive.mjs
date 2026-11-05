// -----------------------------------------------
// HEADLESS CHROME DRIVER: plays a scenario on the local site and takes screenshots
// -----------------------------------------------
// node tools/drive.mjs <scenario.mjs> <out-dir> [baseUrl]
// The scenario module exports `default async (page) => {...}` and uses the page helpers below.
// Needs the dev server running (npm run dev). Mobile viewport by default.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [scenarioPath, outDir, baseUrl = 'http://localhost:5199/'] = process.argv.slice(2);
if (!scenarioPath || !outDir) {
  console.error('usage: node tools/drive.mjs <scenario.mjs> <out-dir> [baseUrl]');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'drive-'));
const chrome = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = targets.find((t) => t.type === 'page');
  } catch {
    // Chrome not up yet.
  }
}
if (!target) throw new Error('Chrome did not start');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((done) => socket.addEventListener('open', done, { once: true }));
let nextId = 1;
const pending = new Map();
const logs = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { done, fail } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) fail(new Error(message.error.message));
    else done(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') {
    logs.push(`EXCEPTION ${message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text}`);
  } else if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
    logs.push(`${message.params.type.toUpperCase()} ${message.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  } else if (message.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true });
  }
});
function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((done, fail) => pending.set(id, { done, fail }));
}

await send('Page.enable');
await send('Runtime.enable');

const page = {
  sleep,
  async viewport(width = 390, height = 844, scale = 2, mobile = true) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  },
  async goto(hash = '') {
    await send('Page.navigate', { url: `${baseUrl}${hash}` });
    await sleep(900);
  },
  async eval(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  },
  /** Centre of the first element matching the selector, in CSS pixels. */
  async center(selector) {
    const box = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, left: r.left, top: r.top }; })()`);
    if (!box) throw new Error(`no element ${selector}`);
    return box;
  },
  async click(selector) {
    const { x, y } = await page.center(selector);
    await page.tap(x, y);
  },
  async tap(x, y) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(150);
  },
  /** Presses at the first point, moves through the others, releases at the last. */
  async drag(points) {
    const [first] = points;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: first.x, y: first.y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: first.x, y: first.y, button: 'left', clickCount: 1 });
    for (const point of points.slice(1)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, buttons: 1 });
    const last = points.at(-1);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: last.x, y: last.y, button: 'left', clickCount: 1 });
    await sleep(150);
  },
  /** The same with a finger: touch events, as a phone sends them. */
  async swipe(points) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    const point = ({ x, y }) => [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }];
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(points[0]) });
    for (const p of points.slice(1)) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(p) });
      await sleep(16);
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(200);
  },
  async shot(name, fullPage = false) {
    const params = { format: 'png' };
    if (fullPage) {
      const { width, height } = await page.eval('({ width: document.documentElement.clientWidth, height: document.documentElement.scrollHeight })');
      params.clip = { x: 0, y: 0, width, height, scale: 1 };
      params.captureBeyondViewport = true;
    }
    const { data } = await send('Page.captureScreenshot', params);
    const path = resolve(outDir, `${name}.png`);
    writeFileSync(path, Buffer.from(data, 'base64'));
    console.log(`shot ${path}`);
  },
  log(text) {
    console.log(text);
  },
};

try {
  await page.viewport();
  const scenario = await import(pathToFileURL(resolve(scenarioPath)).href);
  await scenario.default(page);
} catch (error) {
  console.error(`SCENARIO FAILED: ${error.stack ?? error}`);
  process.exitCode = 1;
} finally {
  if (logs.length) console.log(`\nPage errors/warnings:\n${logs.join('\n')}`);
  socket.close();
  chrome.kill();
}
