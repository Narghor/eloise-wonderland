import './origami.css';
import { el, topBar } from '../../dom';
import { addCoins, loadCompanion } from '../../companion/companionSave';
import { armSoundUnlock, muteButton, playFold, playSmallWin } from '../casino/fx/sound';
import { SCALE, sharpCanvas } from '../leaves/leavesArt';
import { MODELS, applyFold, creaseFrame, split, turned, type Fold, type Piece, type Point } from './origamiModels';
import { loadOrigami, saveOrigami } from './origamiSave';

/** The table, in scene units; the sheet sits with its own coordinates shifted by OFFSET. */
const W = 360;
const H = 330;
const OFFSET = { x: 80, y: 80 };
/** How far from the handle a touch still grabs it. */
const GRAB = 34;
/** Letting go this close to the target makes the fold; this close is perfect. */
const ON_TARGET = 14;
const PERFECT = 6;
/** Straying this far from the arrow's path makes the corner slip. */
const SLIP = 32;
/** Let go before half way, the corner just falls back: a hesitation, not a mistake. */
const HESITATION = 0.5;
/** Coins kept per star mark: 3 stars keep them all. */
const STAR_SHARE = [0, 0.3, 0.6, 1];

export function renderOrigami(root: HTMLElement): () => void {
  armSoundUnlock();
  const save = loadOrigami();
  const model = MODELS[0];
  let pieces: Piece[] = [];
  let step = 0;
  let creases: Fold[] = [];
  /** 0 = flat, 1 = folded over: how far the flap of the current fold has turned. */
  let progress = 0;
  let dragging = false;
  /** Where the held corner is now, in sheet units, while dragging (the finger minus where it grabbed). */
  let finger: Point | null = null;
  /** How far from the corner the finger landed: a finger rarely grabs it dead centre. */
  let grabOffset: Point = { x: 0, y: 0 };
  /** Folds missed on this model; each one left a crumple on the paper. */
  let mistakes = 0;
  let crumples: Point[] = [];
  let praise: { text: string; at: number } | null = null;
  let settling: { from: number; to: number; start: number } | null = null;
  let frame = 0;

  const coinsView = el('span', { class: 'coin-pill' });
  const canvas = el('canvas', { class: 'ori-canvas', width: `${W * SCALE}`, height: `${H * SCALE}` });
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  const hint = el('p', { class: 'ori-hint' });
  const steps = el('div', { class: 'ori-steps' });
  const again = el('button', { class: 'button', type: 'button', text: 'Plier un autre renard' });
  const done = el('div', { class: 'ori-done' });
  const table = drawTable();

  root.append(
    el(
      'main',
      { class: 'ori-screen' },
      topBar('Origami', el('span', { class: 'ori-top-right' }, coinsView, muteButton())),
      el('h2', { class: 'ori-title', text: `${model.icon} ${model.name}` }),
      steps,
      canvas,
      hint,
      done,
    ),
  );

  function start(): void {
    pieces = [{ points: model.sheet.map((p) => ({ ...p })), front: false }];
    step = 0;
    creases = [];
    progress = 0;
    mistakes = 0;
    crumples = [];
    done.replaceChildren();
    paint();
  }

  function paint(): void {
    coinsView.textContent = `${loadCompanion().coins} 🪙`;
    steps.replaceChildren(...model.folds.map((_, i) => el('span', { class: `ori-step${i < step ? ' is-done' : i === step ? ' is-on' : ''}` })));
    hint.textContent = step < model.folds.length ? model.folds[step].hint : `Ton ${model.name.toLowerCase()} est plié !`;
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  function drawTable(): HTMLCanvasElement {
    const [table, g] = sharpCanvas(W, H);
    const wood = g.createLinearGradient(0, 0, 0, H);
    wood.addColorStop(0, '#d9b48a');
    wood.addColorStop(1, '#c49a6c');
    g.fillStyle = wood;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgb(120 80 40 / 0.18)';
    g.lineWidth = 1;
    for (let y = 18; y < H; y += 26) {
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(W * 0.3, y - 4, W * 0.6, y + 5, W, y);
      g.stroke();
    }
    return table;
  }

  const at = (p: Point): Point => ({ x: p.x + OFFSET.x, y: p.y + OFFSET.y });

  function polygon(points: Point[]): void {
    ctx.beginPath();
    points.forEach((p, i) => {
      const q = at(p);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
  }

  function drawPiece(points: Point[], front: boolean, light = 1): void {
    polygon(points);
    ctx.fillStyle = front ? model.color : '#fffaf2';
    ctx.fill();
    if (light !== 1) {
      ctx.fillStyle = light < 1 ? `rgb(0 0 0 / ${(1 - light) * 0.35})` : `rgb(255 255 255 / ${(light - 1) * 0.6})`;
      ctx.fill();
    }
    ctx.strokeStyle = front ? 'rgb(120 50 20 / 0.55)' : 'rgb(150 130 110 / 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const tick = (time: number) => {
    if (settling) {
      const t = Math.min(1, (time - settling.start) / 160);
      progress = settling.from + (settling.to - settling.from) * t;
      if (t >= 1) {
        const finished = settling.to === 1;
        settling = null;
        if (finished) commit();
      }
    }
    ctx.drawImage(table, 0, 0, W, H);
    const fold = step < model.folds.length ? model.folds[step] : null;
    if (fold && progress > 0) {
      const { normal, distance } = creaseFrame(fold);
      const flap: Piece[] = [];
      const lying: Piece[] = [];
      for (const piece of pieces) {
        const { moving, staying } = split(piece, distance);
        if (staying) lying.push(staying);
        if (moving) flap.push(moving);
      }
      shadowUnder(lying);
      for (const piece of lying) drawPiece(piece.points, piece.front);
      drawCreases(lying);
      // The flap, seen turning: its back shows once it passes upright; it darkens as it stands up.
      const c = Math.cos(Math.PI * progress);
      const lift = Math.sin(Math.PI * progress);
      ctx.save();
      ctx.shadowColor = 'rgb(60 30 10 / 0.35)';
      ctx.shadowBlur = 14 * lift;
      ctx.shadowOffsetY = 8 * lift;
      for (const piece of c < 0 ? [...flap].reverse() : flap) {
        drawPiece(
          piece.points.map((p) => turned(p, normal, distance, progress)),
          c < 0 ? !piece.front : piece.front,
          0.8 + 0.2 * Math.abs(c),
        );
      }
      ctx.restore();
    } else {
      shadowUnder(pieces);
      for (const p of pieces) drawPiece(p.points, p.front);
      drawCreases(pieces);
    }

    drawCrumples();
    if (fold && !settling) drawGuide(fold, time);
    if (fold && dragging) drawTarget(fold);
    if (!fold) drawFace();
    if (praise && time - praise.at < 900) {
      const k = (time - praise.at) / 900;
      ctx.globalAlpha = 1 - k;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgb(90 50 20 / 0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText(praise.text, W / 2, 50 - k * 16);
      ctx.fillText(praise.text, W / 2, 50 - k * 16);
      ctx.globalAlpha = 1;
    }
    frame = requestAnimationFrame(tick);
  };

  /** A soft shadow under the paper lying on the table. */
  function shadowUnder(lying: Piece[]): void {
    ctx.save();
    ctx.shadowColor = 'rgb(60 30 10 / 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    for (const p of lying) {
      polygon(p.points);
      ctx.fillStyle = p.front ? model.color : '#fffaf2';
      ctx.fill();
    }
    ctx.restore();
  }

  /** The creases already made, kept on the paper only. */
  function drawCreases(on: Piece[]): void {
    ctx.save();
    ctx.beginPath();
    for (const p of on) {
      p.points.forEach((q, i) => {
        const s = at(q);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.closePath();
    }
    ctx.clip();
    ctx.strokeStyle = 'rgb(90 50 20 / 0.25)';
    ctx.lineWidth = 0.8;
    for (const c of creases) {
      const a = at(c.a);
      const b = at(c.b);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The dashed crease, the curved arrow, and the pulsing spot to grab. */
  function drawGuide(fold: Fold, time: number): void {
    const a = at(fold.a);
    const b = at(fold.b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgb(60 90 160 / 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x - dx * 0.08, a.y - dy * 0.08);
    ctx.lineTo(b.x + dx * 0.08, b.y + dy * 0.08);
    ctx.stroke();
    ctx.restore();
    if (dragging || progress > 0) return;
    const { normal, distance } = creaseFrame(fold);
    const from = at(fold.handle);
    const to = at(turned(fold.handle, normal, distance, 1));
    const mid = { x: (from.x + to.x) / 2 + normal.x * 0 - normal.y * 30, y: (from.y + to.y) / 2 + normal.x * 30 };
    ctx.strokeStyle = 'rgb(60 90 160 / 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mid.x, mid.y, to.x, to.y);
    ctx.stroke();
    const angle = Math.atan2(to.y - mid.y, to.x - mid.x);
    ctx.fillStyle = 'rgb(60 90 160 / 0.8)';
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - Math.cos(angle - 0.4) * 10, to.y - Math.sin(angle - 0.4) * 10);
    ctx.lineTo(to.x - Math.cos(angle + 0.4) * 10, to.y - Math.sin(angle + 0.4) * 10);
    ctx.fill();
    const pulse = 0.5 + 0.5 * Math.sin(time / 250);
    ctx.fillStyle = `rgb(255 255 255 / ${0.55 + pulse * 0.3})`;
    ctx.strokeStyle = 'rgb(60 90 160 / 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(from.x, from.y, 9 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /** Where the grabbed corner must land: it lights up when the finger is on it. */
  function drawTarget(fold: Fold): void {
    const target = targetOf(fold);
    const on = finger !== null && Math.hypot(finger.x - target.x, finger.y - target.y) <= ON_TARGET;
    const p = at(target);
    ctx.strokeStyle = on ? 'rgb(80 170 90 / 0.95)' : 'rgb(60 90 160 / 0.6)';
    ctx.fillStyle = on ? 'rgb(140 220 140 / 0.35)' : 'rgb(255 255 255 / 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ON_TARGET, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /** The marks a missed fold leaves: little grey zigzags. */
  function drawCrumples(): void {
    ctx.strokeStyle = 'rgb(90 70 60 / 0.45)';
    ctx.lineWidth = 1;
    for (const c of crumples) {
      const p = at(c);
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = p.x - 9 + i * 3;
        const y = p.y + (i % 2 ? -3 : 3);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawFace(): void {
    for (const f of model.face) {
      const p = at(f);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(255 255 255 / 0.8)';
      ctx.beginPath();
      ctx.arc(p.x - f.r * 0.3, p.y - f.r * 0.35, f.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // -----------------------------------------------
  // THE FINGER
  // -----------------------------------------------

  function point(event: PointerEvent): Point {
    const box = canvas.getBoundingClientRect();
    return { x: ((event.clientX - box.left) * W) / box.width - OFFSET.x, y: ((event.clientY - box.top) * H) / box.height - OFFSET.y };
  }

  /** How far the finger has carried the handle: 0 on its corner, 1 on the corner's mirror image. */
  function progressAt(fold: Fold, finger: Point): number {
    const { distance } = creaseFrame(fold);
    const reach = distance(fold.handle);
    return Math.max(0, Math.min(1, (reach - distance(finger)) / (2 * reach)));
  }

  canvas.addEventListener('pointerdown', (event) => {
    const fold = model.folds[step];
    if (!fold || settling) return;
    const p = point(event);
    if (Math.hypot(p.x - fold.handle.x, p.y - fold.handle.y) > GRAB) {
      hint.textContent = `👉 Attrape le rond qui clignote. ${fold.hint}`;
      return;
    }
    dragging = true;
    grabOffset = { x: p.x - fold.handle.x, y: p.y - fold.handle.y };
    finger = { ...fold.handle };
    canvas.setPointerCapture(event.pointerId);
    progress = 0.02;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const fold = model.folds[step];
    const p = point(event);
    finger = { x: p.x - grabOffset.x, y: p.y - grabOffset.y };
    progress = Math.max(0.02, progressAt(fold, finger));
    // Too far off the arrow's path, the corner slips out of the fingers.
    if (offPath(fold, finger) > SLIP) miss('Le coin a glissé ! Suis bien la flèche.');
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    const fold = model.folds[step];
    const gap = finger ? Math.hypot(finger.x - targetOf(fold).x, finger.y - targetOf(fold).y) : Infinity;
    finger = null;
    if (gap <= ON_TARGET) {
      if (gap <= PERFECT) praise = { text: 'Parfait !', at: performance.now() };
      settling = { from: progress, to: 1, start: performance.now() };
    } else if (progress < HESITATION) {
      settling = { from: progress, to: 0, start: performance.now() };
      hint.textContent = fold.hint;
    }
    else miss(progress >= 1 ? 'Trop loin ! Lâche pile sur le cercle.' : 'Pas assez loin ! Lâche pile sur le cercle.');
  };

  /** A fold let go off target: the flap falls back and the paper keeps a crumple. */
  function miss(why: string): void {
    const fold = model.folds[step];
    dragging = false;
    finger = null;
    mistakes++;
    // The crumple lands somewhere along the fold that went wrong.
    const target = targetOf(fold);
    const k = 0.35 + Math.random() * 0.3;
    crumples.push({ x: fold.handle.x + (target.x - fold.handle.x) * k + (Math.random() - 0.5) * 30, y: fold.handle.y + (target.y - fold.handle.y) * k + (Math.random() - 0.5) * 30 });
    settling = { from: progress, to: 0, start: performance.now() };
    hint.textContent = `😣 ${why}`;
    navigator.vibrate?.([10, 40, 10]);
  }

  /** Where the grabbed corner lands once folded: its mirror image across the crease. */
  function targetOf(fold: Fold): Point {
    const { normal, distance } = creaseFrame(fold);
    return turned(fold.handle, normal, distance, 1);
  }

  /** How far the finger strays sideways from the straight path between the corner and its target. */
  function offPath(fold: Fold, p: Point): number {
    const a = fold.handle;
    const b = targetOf(fold);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1.3, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /** The fold snaps into place: the sheet is rebuilt, the crease stays marked. */
  function commit(): void {
    const fold = model.folds[step];
    pieces = applyFold(pieces, fold);
    creases.push(fold);
    step++;
    progress = 0;
    playFold();
    navigator.vibrate?.(12);
    if (step === model.folds.length) finish();
    paint();
  }

  function finish(): void {
    const first = !save.folded[model.id];
    save.folded[model.id] = (save.folded[model.id] ?? 0) + 1;
    saveOrigami(save);
    // Each missed fold costs a star: a crumpled fox is still a fox, just worth less.
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const coins = Math.max(1, Math.round((first ? model.coins[0] : model.coins[1]) * STAR_SHARE[stars]));
    addCoins(coins);
    playSmallWin();
    done.replaceChildren(
      el('strong', { class: 'ori-stars', text: '⭐'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('strong', { text: `${model.icon} Ton ${model.name.toLowerCase()} est plié ! +${coins} 🪙` }),
      el('span', { text: mistakes === 0 ? 'Aucun faux pli, bravo !' : `${mistakes} faux pli${mistakes > 1 ? 's' : ''} : le papier est un peu froissé.` }),
      el('span', { text: `Renards pliés : ${save.folded[model.id]}` }),
      again,
    );
  }

  again.addEventListener('click', start);

  start();
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
