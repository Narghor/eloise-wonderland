import './fishing.css';
import { el, topBar } from '../../dom';
import { companionCanvas } from '../../companion/companionArt';
import { addCoins, loadCompanion, saveCompanion } from '../../companion/companionSave';
import { armSoundUnlock, muteButton, playBigWin, playFishBite, playLose, playReelStop, playSmallWin } from '../casino/fx/sound';
import { CASINO_TEST_BUTTONS } from '../casino/fx/testMode'; // TEST-BUTTONS
import { fishCanvas } from './fishingArt';
import { BAITS, BAIT_PACK, FIGHT_HINTS, FINDS, FIND_CHANCE, FISH, RARITY_NAMES, SEASON_NAMES, TIME_NAMES, type BaitId, type Find, type Fish } from './fishingData';
import { NEW_SPECIES_BONUS, biteWindow, challengeOf, drawFish, drawSize, fightOf, priceOf, seasonOf, streakBonus, timeOfDay } from './fishingLogic';
import { loadFishing, saveFishing } from './fishingSave';

type Phase = 'idle' | 'charging' | 'waiting' | 'bite' | 'reeling' | 'result';

/** Where the float lands: from just off the pier to the far bank, in % of the scene width. */
const NEAR_X = 30;
const FAR_X = 92;
const WATER_Y = 58;
/** Bar widths per second the green zone slides while held or released. */
const ZONE_SPEED = 0.7;
const ROD_HAND = { x: 19, y: 62 };
const ROD_TIP = { x: 33, y: 38 };

export function renderFishing(root: HTMLElement): () => void {
  armSoundUnlock();
  const timers = new Set<number>();
  let frame = 0;
  const later = (ms: number, action: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      action();
    }, ms);
    timers.add(id);
  };
  const clearTimers = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  };

  let phase: Phase = 'idle';
  let power = 0;
  let distance = 0;
  let hooked: Fish | null = null;
  let biteAt = 0;
  /** Catches in a row this session; a miss resets it. */
  let streak = 0;
  /** The bait on the hook for the current cast. */
  let castBait: BaitId = 'worm';
  let forcedFish: string | null = null; // TEST-BUTTONS: next bite is this fish id, or 'find'

  const coinsView = el('span', { class: 'coin-pill' });
  const paintCoins = () => (coinsView.textContent = `${loadCompanion().coins} 🪙`);
  paintCoins();

  // -----------------------------------------------
  // THE SCENE
  // -----------------------------------------------

  const time = timeOfDay();
  const season = seasonOf();
  const float = el('div', { class: 'fish-float' });
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('class', 'fish-line');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'fish-line-layer');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  const rod = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  rod.setAttribute('class', 'fish-rod');
  rod.setAttribute('x1', `${ROD_HAND.x}`);
  rod.setAttribute('y1', `${ROD_HAND.y}`);
  rod.setAttribute('x2', `${ROD_TIP.x}`);
  rod.setAttribute('y2', `${ROD_TIP.y}`);
  svg.append(rod, line);
  const powerFill = el('span', {});
  const powerBar = el('div', { class: 'fish-power' }, powerFill);
  const mark = el('div', { class: 'fish-mark', text: '!' });
  const zone = el('div', { class: 'fish-zone' });
  const target = el('div', { class: 'fish-target' });
  const progressFill = el('span', {});
  const streakBadge = el('div', { class: 'fish-streak' });
  const reel = el('div', { class: 'fish-reel' }, el('div', { class: 'fish-track' }, zone, target), el('div', { class: 'fish-progress' }, progressFill));
  const scene = el(
    'div',
    { class: `fish-scene is-${time} is-${season}` },
    el('div', { class: 'fish-sky' }, el('div', { class: 'fish-astre' })),
    el('div', { class: 'fish-far-bank' }),
    el('div', { class: 'fish-water' }),
    el('div', { class: 'fish-reflection' }),
    el('div', { class: 'fish-pier' }),
    el('div', { class: 'fish-angler' }, companionCanvas(loadCompanion().look, 64)),
    svg,
    float,
    mark,
    powerBar,
    reel,
    streakBadge,
  );
  const status = el('p', { class: 'fish-status', role: 'status' });
  const baitBar = el('div', { class: 'fish-baits' });
  const challengeLine = el('p', { class: 'fish-challenge' });
  const host = el('div', { class: 'fish-host' });
  const notebookButton = el('button', { class: 'button button-secondary', type: 'button' });
  const tankButton = el('button', { class: 'button button-secondary', type: 'button', text: '🐠 Aquarium' });
  let open: 'notebook' | 'tank' | null = null;
  notebookButton.addEventListener('click', () => toggle('notebook'));
  tankButton.addEventListener('click', () => toggle('tank'));

  root.append(
    topBar('La pêche', el('span', { class: 'fish-top-right' }, coinsView, muteButton())),
    el(
      'main',
      { class: 'fish-screen' },
      scene,
      status,
      baitBar,
      challengeLine,
      el('p', { class: 'fish-when', text: `🕰️ ${capital(TIME_NAMES[time])}, ${SEASON_NAMES[season]} : certains poissons ne mordent qu’à ces moments-là.` }),
      el('div', { class: 'fish-actions' }, notebookButton, tankButton),
      host,
      ...(CASINO_TEST_BUTTONS ? [fishingTestBar()] : []), // TEST-BUTTONS
    ),
  );

  // TEST-BUTTONS: force the next bite to show each special fight and a find.
  function fishingTestBar(): HTMLElement {
    const label = el('span', { text: 'rien de forcé' });
    const button = (text: string, id: string) => {
      const b = el('button', { class: 'casino-test-button', type: 'button', text });
      b.addEventListener('click', () => {
        forcedFish = id;
        label.textContent = `prochain : ${text}`;
      });
      return b;
    };
    return el('div', { class: 'casino-test-bar' }, el('b', { text: 'TEST' }), label, button('Saut', 'dragon'), button('Disparition', 'lune'), button('À-coups', 'geant'), button('Trouvaille', 'find'), button('Normal', ''));
  }

  function toggle(which: 'notebook' | 'tank'): void {
    open = open === which ? null : which;
    host.replaceChildren(...(open === 'notebook' ? [notebook()] : open === 'tank' ? [tank()] : []));
    notebookButton.classList.toggle('is-on', open === 'notebook');
    tankButton.classList.toggle('is-on', open === 'tank');
  }

  // -----------------------------------------------
  // BAITS, STREAK, DAILY CHALLENGE
  // -----------------------------------------------

  const today = new Date().toISOString().slice(0, 10);
  const challenge = challengeOf(today, season);

  function paintBaits(): void {
    const save = loadFishing();
    const chips = BAITS.map((bait) => {
      const left = bait.price === 0 ? '∞' : `${save.baits[bait.id] ?? 0}`;
      const button = el('button', { class: `fish-bait${save.bait === bait.id ? ' is-on' : ''}`, type: 'button', title: bait.effect }, el('span', { text: bait.icon }), el('small', { text: `${bait.name} · ${left}` }));
      button.addEventListener('click', () => {
        if (phase !== 'idle') return;
        const s = loadFishing();
        s.bait = bait.id;
        saveFishing(s);
        paintBaits();
      });
      return button;
    });
    const chosen = BAITS.find((b) => b.id === save.bait)!;
    const extra: HTMLElement[] = [el('small', { class: 'fish-bait-effect', text: chosen.effect })];
    if (chosen.price > 0) {
      const buy = el('button', { class: 'button button-secondary fish-buy', type: 'button', text: `Acheter ×${BAIT_PACK} · ${chosen.price} 🪙` });
      buy.addEventListener('click', () => {
        const companion = loadCompanion();
        if (companion.coins < chosen.price) {
          status.textContent = 'Pas assez de pièces pour cet appât.';
          return;
        }
        companion.coins -= chosen.price;
        saveCompanion(companion);
        const s = loadFishing();
        s.baits[chosen.id] = (s.baits[chosen.id] ?? 0) + BAIT_PACK;
        saveFishing(s);
        paintCoins();
        paintBaits();
      });
      extra.push(buy);
    }
    baitBar.replaceChildren(el('div', { class: 'fish-bait-row' }, ...chips), el('div', { class: 'fish-bait-row' }, ...extra));
  }

  function paintStreak(): void {
    streakBadge.textContent = streak >= 2 ? `🔥 ${streak} d’affilée${streakBonus(streak) > 1 ? ` · ×${String(streakBonus(streak)).replace('.', ',')}` : ''}` : '';
  }

  function paintChallenge(): void {
    const { challenge: state } = loadFishing();
    const progress = state.day === today ? state.progress : 0;
    const done = state.day === today && state.done;
    challengeLine.textContent = done
      ? `🎯 Défi du jour réussi ! Reviens demain pour un nouveau défi.`
      : `🎯 Défi du jour : ${challenge.text} (${Math.min(progress, challenge.goal)}/${challenge.goal}) · +${challenge.reward} 🪙`;
    challengeLine.classList.toggle('is-done', done);
  }

  function paintNotebookButton(): void {
    notebookButton.textContent = `📒 Carnet ${Object.keys(loadFishing().caught).length}/${FISH.length}`;
  }

  // -----------------------------------------------
  // CAST, WAIT, STRIKE
  // -----------------------------------------------

  function setPhase(next: Phase, text: string): void {
    phase = next;
    scene.dataset.phase = next;
    status.textContent = text;
  }

  function placeFloat(): void {
    const x = NEAR_X + (FAR_X - NEAR_X) * distance;
    float.style.left = `${x}%`;
    float.style.top = `${WATER_Y + 4 + distance * -6}%`;
    mark.style.left = `${x}%`;
    line.setAttribute('x1', `${ROD_TIP.x}`);
    line.setAttribute('y1', `${ROD_TIP.y}`);
    line.setAttribute('x2', `${x}`);
    line.setAttribute('y2', `${WATER_Y + 4 + distance * -6}`);
  }

  function idle(): void {
    cancelAnimationFrame(frame);
    clearTimers();
    hooked = null;
    float.className = 'fish-float';
    setPhase('idle', 'Maintiens le doigt sur l’étang, puis relâche pour lancer. Plus c’est loin, plus les poissons rares viennent.');
  }

  function startCharge(): void {
    setPhase('charging', 'Relâche pour lancer !');
    const start = performance.now();
    const step = (now: number) => {
      // Ping-pong 0 -> 1 -> 0, one way in 0.9 s.
      const t = ((now - start) / 900) % 2;
      power = t < 1 ? t : 2 - t;
      powerFill.style.width = `${power * 100}%`;
      if (phase === 'charging') frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  function cast(): void {
    cancelAnimationFrame(frame);
    distance = power;
    const save = loadFishing();
    castBait = save.bait !== 'worm' && (save.baits[save.bait] ?? 0) > 0 ? save.bait : 'worm';
    if (castBait !== 'worm') {
      save.baits[castBait] = (save.baits[castBait] ?? 0) - 1;
      if (save.baits[castBait]! <= 0) save.bait = 'worm';
      saveFishing(save);
      paintBaits();
    }
    placeFloat();
    float.className = 'fish-float is-landing';
    playReelStop(1);
    setPhase('waiting', 'Attends que le bouchon plonge… Touche à ce moment-là !');
    const wait = 4000 + Math.random() * 7000;
    // A few false alarms: the float twitches but nothing has bitten.
    const nibbles = Math.floor(Math.random() * 3);
    for (let i = 0; i < nibbles; i++) later(1200 + Math.random() * (wait - 1600), nibble);
    later(wait, bite);
  }

  function nibble(): void {
    if (phase !== 'waiting') return;
    float.classList.remove('is-nibble');
    void float.offsetWidth;
    float.classList.add('is-nibble');
  }

  function bite(): void {
    hooked = (forcedFish && FISH.find((f) => f.id === forcedFish)) || drawFish(time, season, distance, castBait); // TEST-BUTTONS
    biteAt = performance.now();
    float.className = 'fish-float is-diving';
    playFishBite();
    // Phones that allow it (Android) buzz; elsewhere this does nothing.
    navigator.vibrate?.([120, 60, 120]);
    setPhase('bite', 'ÇA MORD ! Touche vite !');
    later(biteWindow(hooked), () => {
      if (phase === 'bite') miss('Trop tard… il a filé avec l’appât.');
    });
  }

  function miss(text: string): void {
    if (streak >= 2) text += ` La série de ${streak} s’arrête.`;
    streak = 0;
    paintStreak();
    playLose();
    clearTimers();
    cancelAnimationFrame(frame);
    float.className = 'fish-float';
    setPhase('result', text);
    later(1600, idle);
  }

  // -----------------------------------------------
  // REELING: keep the zone on the fish
  // -----------------------------------------------

  let holding = false;

  function startReel(fish: Fish): void {
    clearTimers();
    setPhase(
      'reeling',
      fish.fight ? `Un gros poisson ! ${FIGHT_HINTS[fish.fight]}` : 'Garde la zone verte sur le poisson : appuie pour la pousser à droite, relâche pour qu’elle revienne.',
    );
    const fight = fightOf(fish);
    let trick = 1.8 + Math.random();
    let hiddenUntil = 0;
    target.replaceChildren(fishCanvas(fish, 2, true));
    zone.style.width = `${fight.zone * 100}%`;
    let fishX = 0.5;
    let goal = Math.random();
    let nextTurn = fight.restless;
    let zoneX = 0.5 - fight.zone / 2;
    let progress = 0.4;
    let last = performance.now();
    const started = last;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      nextTurn -= dt;
      if (nextTurn <= 0) {
        goal = Math.random();
        nextTurn = fight.restless * (0.6 + Math.random() * 0.8);
      }
      // The fish tires: after 20 s it swims 40 % slower and pulls half as hard.
      const tired = Math.min(1, (now - started) / 20000);
      fishX += Math.sign(goal - fishX) * Math.min(Math.abs(goal - fishX), fight.speed * (1 - 0.4 * tired) * dt);
      // A big fish's trick, every few seconds.
      trick -= dt;
      if (fish.fight && trick <= 0) {
        trick = (fish.fight === 'jump' ? 3.4 : 2.2) + Math.random() * 1.5;
        if (fish.fight === 'jump') {
          fishX = goal = fishX < 0.5 ? fishX + 0.35 : fishX - 0.35;
          splash(target);
        } else if (fish.fight === 'vanish') hiddenUntil = now + 900;
        else {
          progress = Math.max(0.02, progress - 0.07);
          splash(reel);
        }
      }
      target.classList.toggle('is-hidden', now < hiddenUntil);
      // Direct control: holding slides the zone right, releasing slides it back, at a steady pace.
      zoneX = Math.max(0, Math.min(1 - fight.zone, zoneX + (holding ? ZONE_SPEED : -ZONE_SPEED) * dt));
      const inside = fishX >= zoneX && fishX <= zoneX + fight.zone;
      progress = Math.max(0, Math.min(1, progress + (inside ? fight.gain : -fight.loss * (1 - 0.5 * tired)) * dt));
      zone.style.left = `${zoneX * 100}%`;
      zone.classList.toggle('is-on', inside);
      target.style.left = `${fishX * 100}%`;
      progressFill.style.width = `${progress * 100}%`;
      if (progress >= 1) return land(fish);
      if (progress <= 0) return miss('La ligne s’est détendue… le poisson s’est échappé !');
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  function splash(host: HTMLElement): void {
    host.classList.remove('is-shaken');
    void host.offsetWidth;
    host.classList.add('is-shaken');
  }

  // -----------------------------------------------
  // THE CATCH
  // -----------------------------------------------

  function land(fish: Fish): void {
    cancelAnimationFrame(frame);
    float.className = 'fish-float';
    streak++;
    paintStreak();
    if (forcedFish === 'find' || Math.random() < FIND_CHANCE) return landFind(); // TEST-BUTTONS
    const size = drawSize(fish, castBait);
    const save = loadFishing();
    const before = save.caught[fish.id];
    const isNew = !before;
    const record = !!before && size > before.best;
    save.caught[fish.id] = { count: (before?.count ?? 0) + 1, best: Math.max(before?.best ?? 0, size) };
    const bonus = streakBonus(streak);
    const coins = Math.round(priceOf(fish, size) * bonus) + (isNew ? NEW_SPECIES_BONUS : 0);
    save.earned += coins;
    const challengeDone = advanceChallenge(save, challenge.counts(fish, size));
    saveFishing(save);
    addCoins(coins);
    paintCoins();
    paintNotebookButton();
    paintChallenge();
    if (fish.rarity >= 4) playBigWin(fish.rarity - 3);
    else playSmallWin();
    setPhase('result', `${fish.name} attrapé !`);
    const extras = [
      ...(isNew ? [`+${NEW_SPECIES_BONUS} pièces pour une nouvelle espèce`] : []),
      ...(bonus > 1 ? [`Série de ${streak} : prix ×${String(bonus).replace('.', ',')} !`] : []),
      ...(challengeDone ? [challengeDone] : []),
    ];
    showCard(
      `is-rarity-${fish.rarity}`,
      isNew ? 'Nouveau !' : record ? 'Record !' : null,
      fishCanvas(fish, 8),
      fish.name,
      `${RARITY_NAMES[fish.rarity]} · ${size} cm`,
      fish.note,
      extras,
      `Vendre · +${coins} 🪙`,
    );
  }

  /** Counts a catch toward today's challenge; pays and returns a line when it is just completed. */
  function advanceChallenge(save: ReturnType<typeof loadFishing>, counts: boolean): string | null {
    if (save.challenge.day !== today) save.challenge = { day: today, progress: 0, done: false };
    if (!counts || save.challenge.done) return null;
    save.challenge.progress++;
    if (save.challenge.progress < challenge.goal) return null;
    save.challenge.done = true;
    addCoins(challenge.reward);
    return `🎯 Défi du jour réussi : +${challenge.reward} pièces !`;
  }

  /** Now and then, something else than a fish comes up. */
  function landFind(): void {
    const roll = Math.random();
    const find: Find = FINDS[roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2];
    const save = loadFishing();
    save.finds[find.id] = (save.finds[find.id] ?? 0) + 1;
    let coins = 0;
    let line = find.note;
    if (find.id === 'chest') coins = 8 + Math.floor(Math.random() * 13);
    if (find.id === 'bottle') {
      const missing = FISH.filter((f) => !save.caught[f.id] && (f.times || f.season || f.far));
      const tip = missing[Math.floor(Math.random() * missing.length)];
      line = tip ? `Le message dit : « On raconte qu’un poisson appelé ${tip.name} se montre ${hint(tip).toLowerCase()}… »` : 'Le message dit : « Patience : les poissons communs finissent toujours par mordre. »';
    }
    save.earned += coins;
    saveFishing(save);
    if (coins > 0) addCoins(coins);
    paintCoins();
    playSmallWin();
    setPhase('result', `${find.name} !`);
    showCard('is-find', 'Trouvaille !', el('span', { class: 'fish-find-icon', text: find.icon }), find.name, 'Pas un poisson…', line, [], coins > 0 ? `Garder · +${coins} 🪙` : 'Remettre à l’eau');
  }

  function showCard(kind: string, badge: string | null, picture: HTMLElement, name: string, subtitle: string, note: string, extras: string[], action: string): void {
    const close = el('button', { class: 'button', type: 'button', text: action });
    const dialog = el(
      'div',
      { class: 'fish-dialog', role: 'dialog', 'aria-label': name },
      el(
        'div',
        { class: `fish-card ${kind}` },
        ...(badge ? [el('span', { class: 'fish-badge', text: badge })] : []),
        picture,
        el('strong', { class: 'fish-card-name', text: name }),
        el('span', { class: 'fish-card-rarity', text: subtitle }),
        el('p', { class: 'fish-card-note', text: note }),
        ...extras.map((line) => el('small', { class: 'fish-card-extra', text: line })),
        close,
      ),
    );
    close.addEventListener('click', () => {
      dialog.remove();
      if (open) host.replaceChildren(open === 'notebook' ? notebook() : tank());
      idle();
    });
    document.body.append(dialog);
  }

  // -----------------------------------------------
  // NOTEBOOK AND TANK
  // -----------------------------------------------

  function notebook(): HTMLElement {
    const { caught, finds } = loadFishing();
    return el(
      'section',
      { class: 'fish-notebook' },
      ...FINDS.filter((f) => finds[f.id]).map((f) =>
        el('div', { class: 'fish-entry is-find' }, el('span', { class: 'fish-find-icon is-small', text: f.icon }), el('strong', { text: f.name }), el('small', { text: `Trouvaille · ×${finds[f.id]}` })),
      ),
      ...FISH.map((fish) => {
        const entry = caught[fish.id];
        if (!entry) {
          return el('div', { class: 'fish-entry is-unknown' }, fishCanvas(fish, 3, true), el('strong', { text: '???' }), el('small', { text: hint(fish) }));
        }
        return el(
          'div',
          { class: `fish-entry is-rarity-${fish.rarity}` },
          fishCanvas(fish, 3),
          el('strong', { text: fish.name }),
          el('small', { text: `${RARITY_NAMES[fish.rarity]} · ×${entry.count} · record ${entry.best} cm` }),
        );
      }),
    );
  }

  function tank(): HTMLElement {
    const caught = FISH.filter((fish) => loadFishing().caught[fish.id]);
    if (caught.length === 0) return el('p', { class: 'fish-status', text: 'L’aquarium est vide : chaque nouvelle espèce attrapée viendra y nager.' });
    return el(
      'section',
      { class: 'fish-tank' },
      ...caught.map((fish, i) => {
        const swimmer = el('div', { class: 'fish-swimmer', style: `top:${8 + ((i * 37) % 76)}%;animation-duration:${9 + ((i * 13) % 9)}s;animation-delay:-${(i * 2.3) % 9}s` }, fishCanvas(fish, 3));
        return swimmer;
      }),
      el('div', { class: 'fish-tank-sand' }),
    );
  }

  // -----------------------------------------------
  // INPUT: one finger does everything
  // -----------------------------------------------

  const down = (event: PointerEvent) => {
    event.preventDefault();
    if (phase === 'idle') startCharge();
    else if (phase === 'waiting') miss('Trop tôt ! Le poisson a eu peur.');
    else if (phase === 'bite' && hooked) {
      if (performance.now() - biteAt <= biteWindow(hooked)) startReel(hooked);
    } else if (phase === 'reeling') holding = true;
  };
  const up = () => {
    holding = false;
    if (phase === 'charging') cast();
  };
  scene.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  paintNotebookButton();
  paintBaits();
  paintChallenge();
  paintStreak();
  idle();
  placeFloat();

  return () => {
    cancelAnimationFrame(frame);
    clearTimers();
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    document.querySelectorAll('.fish-dialog').forEach((node) => node.remove());
  };
}

/** What the notebook says about a fish not caught yet. */
function hint(fish: Fish): string {
  const parts = [
    ...(fish.times ? [fish.times.map((t) => TIME_NAMES[t]).join(' ou ')] : []),
    ...(fish.season ? [SEASON_NAMES[fish.season]] : []),
    ...(fish.far ? [fish.far >= 0.7 ? 'très loin du ponton' : 'loin du ponton'] : []),
  ];
  return parts.length > 0 ? capital(parts.join(', ')) : RARITY_NAMES[fish.rarity];
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
