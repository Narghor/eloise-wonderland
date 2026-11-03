import './origami.css';
import { el, topBar } from '../../dom';
import { addCoins, loadCompanion } from '../../companion/companionSave';
import { armSoundUnlock, muteButton, playFold, playSmallWin } from '../casino/fx/sound';
import { SCALE, sharpCanvas } from '../leaves/leavesArt';
import { GROUPS, MODELS, applyFold, creaseFrame, split, turned, type Fold, type Piece, type Point } from './origamiModels';
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
/** A grip closer than this to the crease is too short a lever to pull the flap. */
const MIN_GRIP = 12;
/** Straying this far from the arrow's path makes the corner slip. */
const SLIP = 32;
/** Let go before half way, the corner just falls back: a hesitation, not a mistake. */
const HESITATION = 0.5;
/** Coins kept per star mark: 3 stars keep them all. */
const STAR_SHARE = [0, 0.3, 0.6, 1];

/** Whether a point lies inside a convex polygon. */
function inside(points: Point[], p: Point): boolean {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

export function renderOrigami(root: HTMLElement): () => void {
  armSoundUnlock();
  const save = loadOrigami();
  let model = MODELS[0];
  let pieces: Piece[] = [];
  let step = 0;
  let creases: Fold[] = [];
  /** 0 = flat, 1 = folded over: how far the flap of the current fold has turned. */
  let progress = 0;
  let dragging = false;
  /** Where the finger is, in sheet units, while dragging. */
  let finger: Point | null = null;
  /** The spot of paper the finger grabbed: the corner, or anywhere on the part that folds. */
  let grip: Point = { x: 0, y: 0 };
  /** Where the finger sits from the spot it holds (zero when it grabbed the flap itself). */
  let gripOffset: Point = { x: 0, y: 0 };
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
  const again = el('button', { class: 'button button-secondary', type: 'button', text: 'Recommencer' });
  const done = el('div', { class: 'ori-done' });
  const picker = el('div', { class: 'ori-models' });
  const title = el('h2', { class: 'ori-title' });
  const table = drawTable();

  root.append(
    el(
      'main',
      { class: 'ori-screen' },
      topBar('Origami', el('span', { class: 'ori-top-right' }, coinsView, muteButton())),
      picker,
      title,
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

  /** A model opens once the one before it has been folded at least once. */
  const isOpen = (index: number) => index === 0 || !!save.folded[MODELS[index - 1].id];

  function paint(): void {
    coinsView.textContent = `${loadCompanion().coins} 🪙`;
    title.textContent = `${model.icon} ${model.name}`;
    picker.replaceChildren(
      ...GROUPS.map((g) => {
        const members = MODELS.filter((m) => m.group === g.id);
        const folded = members.filter((m) => save.folded[m.id]).length;
        return el(
          'div',
          { class: 'ori-group' },
          el('small', { class: 'ori-group-name', text: `${g.name} · ${folded}/${members.length}` }),
          el(
            'div',
            { class: 'ori-models' },
            ...members.map((m) => {
              const i = MODELS.indexOf(m);
              const open = isOpen(i);
              const chip = el('button', { class: `ori-model${m === model ? ' is-on' : ''}${save.folded[m.id] ? ' is-done' : ''}`, type: 'button', text: open ? `${m.icon} ${m.name}` : '🔒' });
              chip.title = open ? `${m.folds.length} plis` : `Plie d’abord : ${MODELS[i - 1].name}`;
              chip.disabled = !open || dragging;
              chip.addEventListener('click', () => {
                model = m;
                start();
              });
              return chip;
            }),
          ),
        );
      }),
    );
    steps.replaceChildren(...model.folds.map((_, i) => el('span', { class: `ori-step${i < step ? ' is-done' : i === step ? ' is-on' : ''}` })));
    hint.textContent = step < model.folds.length ? model.folds[step].hint : 'Pliage terminé !';
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
    ctx.fillStyle = front ? model.color : (model.back ?? '#fffaf2');
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
    if (!fold) drawStrokes(true);
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
      ctx.fillStyle = p.front ? model.color : (model.back ?? '#fffaf2');
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
    // The spot to grab sits in the middle of the flap: a finger there leaves the corner and its target in sight.
    const grab = at(flapMiddle(fold));
    const pulse = 0.5 + 0.5 * Math.sin(time / 250);
    ctx.fillStyle = `rgb(255 255 255 / ${0.55 + pulse * 0.3})`;
    ctx.strokeStyle = 'rgb(60 90 160 / 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(grab.x, grab.y, 9 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /** The middle of the part this fold turns over. */
  function flapMiddle(fold: Fold): Point {
    const { distance } = creaseFrame(fold);
    const points = pieces.flatMap((piece) => split(piece, distance).moving?.points ?? []);
    if (points.length === 0) return fold.handle;
    // Halfway between the crease and the corner, across the flap: far enough from the crease to pull well.
    const middle = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
    return distance(middle) >= MIN_GRIP * 1.5 ? middle : { x: (middle.x + fold.handle.x) / 2, y: (middle.y + fold.handle.y) / 2 };
  }

  /** Where the grabbed corner must land: it lights up when the finger is on it. */
  function drawTarget(fold: Fold): void {
    const target = targetOf(fold);
    const on = finger !== null && gapToTarget(fold, finger) <= ON_TARGET;
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

  /** The model's finishing strokes; `under` ones go below the paper (a stem), the others on it (whiskers). */
  function drawStrokes(under: boolean): void {
    ctx.lineCap = 'round';
    for (const s of model.strokes ?? []) {
      if (!!s.under !== under) continue;
      const a = at(s.from);
      const b = at(s.to);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawFace(): void {
    drawStrokes(false);
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

  /** How far the fold has turned: 0 flat, 1 folded over. */
  function progressAt(fold: Fold, finger: Point): number {
    return Math.max(0, Math.min(1, travelAt(fold, finger)));
  }

  /** The same, not capped: above 1 the corner has gone past its target. The grabbed spot of paper follows the finger. */
  function travelAt(fold: Fold, finger: Point): number {
    const { distance } = creaseFrame(fold);
    const reach = distance(grip);
    return (reach - distance(finger)) / (2 * reach);
  }

  /** Whether a spot of the sheet is on the part this fold turns over, far enough from the crease to pull it. */
  function onFlap(fold: Fold, p: Point): boolean {
    const { distance } = creaseFrame(fold);
    if (distance(p) < MIN_GRIP) return false;
    return pieces.some((piece) => {
      const flap = split(piece, distance).moving;
      return flap !== null && inside(flap.points, p);
    });
  }

  /** How far the corner, as drawn, is from its target: only along its path, what the eye sees. */
  function gapToTarget(fold: Fold, finger: Point): number {
    const { distance } = creaseFrame(fold);
    return Math.abs(1 - travelAt(fold, finger)) * 2 * distance(fold.handle);
  }

  canvas.addEventListener('pointerdown', (event) => {
    const fold = model.folds[step];
    if (!fold || settling) return;
    const p = point(event);
    // The corner, or anywhere on the part that folds: holding it back from the corner keeps the target in sight.
    if (Math.hypot(p.x - fold.handle.x, p.y - fold.handle.y) > GRAB && !onFlap(fold, p)) {
      hint.textContent = `👉 Attrape la partie à plier, ou le rond qui clignote. ${fold.hint}`;
      return;
    }
    dragging = true;
    // The finger pulls the spot it pressed; too close to the crease (or past it) that lever is useless, so it pulls the corner.
    grip = creaseFrame(fold).distance(p) >= MIN_GRIP ? p : fold.handle;
    gripOffset = { x: p.x - grip.x, y: p.y - grip.y };
    finger = grip;
    canvas.setPointerCapture(event.pointerId);
    progress = 0.02;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const fold = model.folds[step];
    const p = point(event);
    finger = { x: p.x - gripOffset.x, y: p.y - gripOffset.y };
    progress = Math.max(0.02, progressAt(fold, finger));
    // Too far off the arrow's path, the corner slips out of the fingers.
    if (offPath(fold, finger) > SLIP) miss('Le coin a glissé ! Suis bien la flèche.');
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    const fold = model.folds[step];
    const gap = finger ? gapToTarget(fold, finger) : Infinity;
    const overshot = finger !== null && travelAt(fold, finger) > 1;    finger = null;
    if (gap <= ON_TARGET) {
      if (gap <= PERFECT) praise = { text: 'Parfait !', at: performance.now() };
      settling = { from: progress, to: 1, start: performance.now() };
    } else if (progress < HESITATION) {
      settling = { from: progress, to: 0, start: performance.now() };
      hint.textContent = fold.hint;
    }
    else miss(overshot ? 'Trop loin ! Lâche pile sur le cercle.' : 'Pas assez loin ! Lâche pile sur le cercle.');
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

  /** How far the finger strays sideways from the straight path between the grabbed spot and where it lands. */
  function offPath(fold: Fold, p: Point): number {
    const { normal, distance } = creaseFrame(fold);
    const a = grip;
    const b = turned(grip, normal, distance, 1);
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
    // Each missed fold costs a star: a crumpled model is still a model, just worth less.
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const coins = Math.max(1, Math.round((first ? model.coins[0] : model.coins[1]) * STAR_SHARE[stars]));
    addCoins(coins);
    playSmallWin();
    // The last model of a collection folded for the first time completes it: a bonus.
    const group = GROUPS.find((g) => g.id === model.group)!;
    const completed = first && MODELS.filter((m) => m.group === group.id).every((m) => save.folded[m.id]);
    if (completed) addCoins(group.bonus);
    const index = MODELS.indexOf(model);
    const next = MODELS[index + 1];
    const buttons = [again];
    if (next) {
      const go = el('button', { class: 'button', type: 'button', text: `${first ? 'Nouveau modèle débloqué : ' : 'Modèle suivant : '}${next.icon} ${next.name}` });
      go.addEventListener('click', () => {
        model = next;
        start();
      });
      buttons.unshift(go);
    }
    done.replaceChildren(
      el('strong', { class: 'ori-stars', text: '⭐'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('strong', { text: `${model.icon} ${model.name} : pliage réussi ! +${coins} 🪙` }),
      el('span', { text: mistakes === 0 ? 'Aucun faux pli, bravo !' : `${mistakes} faux pli${mistakes > 1 ? 's' : ''} : le papier est un peu froissé.` }),
      ...(completed ? [el('strong', { class: 'ori-bonus', text: `🎉 Collection ${group.name} complète ! +${group.bonus} 🪙` })] : []),
      el('span', { text: `Plié ${save.folded[model.id]} fois` }),
      el('span', { class: 'ori-buttons' }, ...buttons),
    );
  }

  again.addEventListener('click', start);

  start();
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
