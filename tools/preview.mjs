// -----------------------------------------------
// CONTENT PREVIEW: renders pixel models or colouring-book drawings to a PNG
// -----------------------------------------------
// node tools/preview.mjs pixel <out-dir> src/pictures/models/animals.ts [...more modules]
// node tools/preview.mjs book  <out-dir> src/games/coloringBook/drawings/animals.ts [...]
// Writes <out-dir>/preview-<kind>.html and .png (headless Chrome or Edge), prints problems.

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [kind, outDir, ...modules] = process.argv.slice(2);
if (!['pixel', 'book'].includes(kind) || !outDir || modules.length === 0) {
  console.error('usage: node tools/preview.mjs <pixel|book> <out-dir> <module.ts>...');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const root = resolve(import.meta.dirname, '..');
const toImport = (path) => JSON.stringify(resolve(root, path).replaceAll('\\', '/'));
const entry = [
  ...modules.map((path, i) => `import * as m${i} from ${toImport(path)};`),
  `import { modelProblems } from ${toImport('src/pictures/pixelModel.ts')};`,
  `import { clueOf, isSolvableByLines } from ${toImport('src/games/picross/lines.ts')};`,
  `export const items = [${modules.map((_, i) => `...Object.values(m${i}).filter(Array.isArray).flat()`).join(', ')}];`,
  'export { modelProblems, clueOf, isSolvableByLines };',
].join('\n');

const bundlePath = resolve(outDir, `preview-${kind}.bundle.mjs`);
await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: bundlePath, logLevel: 'error' });
const { items, modelProblems, clueOf, isSolvableByLines } = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`);

const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ids = new Map();
for (const item of items) ids.set(item.id, (ids.get(item.id) ?? 0) + 1);
let cards = '';
let report = '';

if (kind === 'pixel') {
  for (const model of items) {
    const problems = modelProblems(model);
    if (ids.get(model.id) > 1) problems.push('duplicate id');
    const size = model.rows.length;
    let picross = '?';
    if (problems.length === 0) {
      const grid = model.rows.map((row) => [...row].map((c) => c !== '.'));
      const rowClues = grid.map(clueOf);
      const colClues = grid[0].map((_, c) => clueOf(grid.map((row) => row[c])));
      picross = isSolvableByLines(rowClues, colClues) ? 'picross OK' : 'picross NOT solvable';
    }
    const cell = Math.max(8, Math.floor(180 / size));
    let pixels = '';
    for (const row of model.rows) {
      for (const char of row) pixels += `<i style="background:${char === '.' ? '#fff' : model.colors[Number(char)] ?? '#f0f'}"></i>`;
    }
    cards += `<figure><div class="px" style="grid-template-columns:repeat(${size},${cell}px);grid-auto-rows:${cell}px">${pixels}</div>
<figcaption><b>${escape(model.name)}</b> <small>${escape(model.id)} · ${size}x${size} · ${model.colors.length} col.</small><br>
<span class="${picross.includes('NOT') ? 'bad' : 'ok'}">${picross}</span>${problems.map((p) => `<br><span class="bad">${escape(p)}</span>`).join('')}</figcaption></figure>`;
    report += `${model.id.padEnd(22)} ${String(size).padStart(2)}x${size}  ${picross}${problems.length ? '  PROBLEMS: ' + problems.join('; ') : ''}\n`;
  }
} else {
  const line = (d, fill, width) => `<path d="${escape(d)}" fill="${fill}" stroke="#2b2230" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const svg = (drawing, colored) =>
    `<svg viewBox="0 0 100 100" width="260" height="260">` +
    drawing.zones.map((zone) => line(zone.path, colored ? zone.color : '#fff', 1.3)).join('') +
    (drawing.lines ?? []).map((d) => line(d, 'none', 1)).join('') +
    (drawing.inks ?? []).map((d) => `<path d="${escape(d)}" fill="#2b2230"/>`).join('') +
    '</svg>';
  for (const drawing of items) {
    const problems = [];
    if (ids.get(drawing.id) > 1) problems.push('duplicate id');
    if (!/^[a-z0-9-]+$/.test(drawing.id)) problems.push('bad id');
    if (!drawing.zones?.length) problems.push('no zones');
    for (const zone of drawing.zones ?? []) if (!/^#[0-9a-f]{6}$/i.test(zone.color)) problems.push(`bad colour ${zone.color}`);
    const colors = new Set(drawing.zones.map((zone) => zone.color.toLowerCase()));
    cards += `<figure class="book">${svg(drawing, false)}${svg(drawing, true)}<figcaption><b>${escape(drawing.name)}</b> <small>${escape(drawing.id)} · ${drawing.zones.length} zones · ${colors.size} colours</small>${problems.map((p) => `<br><span class="bad">${escape(p)}</span>`).join('')}</figcaption></figure>`;
    report += `${drawing.id.padEnd(22)} ${String(drawing.zones.length).padStart(3)} zones  ${colors.size} colours${problems.length ? '  PROBLEMS: ' + problems.join('; ') : ''}\n`;
  }
}

const perRow = kind === 'pixel' ? 6 : 3;
const width = kind === 'pixel' ? 1440 : 1640;
const cardHeight = kind === 'pixel' ? 270 : 330;
const height = Math.max(400, Math.ceil(items.length / perRow) * cardHeight + 60);
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:16px;font:13px system-ui;background:#f6f1f4;display:grid;grid-template-columns:repeat(${perRow},1fr);gap:12px}
figure{margin:0;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px}
.px{display:grid;background:#fff;margin:auto;width:max-content;outline:1px solid #ccc}
.px i{box-shadow:inset 0 0 0 .5px rgba(0,0,0,.08)}
figure.book{display:grid;grid-template-columns:1fr 1fr;gap:6px} figure.book figcaption{grid-column:1/-1}
svg{background:#fff;border:1px solid #eee;width:100%;height:auto}
.ok{color:#2a7a3a}.bad{color:#c0263a;font-weight:700}
</style>${cards || '<p>No items found.</p>'}`;
const htmlPath = resolve(outDir, `preview-${kind}.html`);
const pngPath = resolve(outDir, `preview-${kind}.png`);
writeFileSync(htmlPath, html);

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const browser = browsers.find(existsSync);
if (browser) {
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--screenshot=${pngPath}`, `--window-size=${width},${height}`, pathToFileURL(htmlPath).href], { stdio: 'ignore' });
}
process.stdout.write(report);
console.log(`\n${items.length} item(s). HTML: ${htmlPath}${browser ? `\nPNG:  ${pngPath}` : '\n(no browser found for the PNG)'}`);
