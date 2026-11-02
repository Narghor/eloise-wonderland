import { el } from '../../../dom';

// -----------------------------------------------
// CASINO SOUND (WebAudio, synthesized, no files)
// -----------------------------------------------

const MUTE_KEY = 'casino-sound-muted';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
let unlockArmed = false;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Creates the audio context on the first user gesture (browsers block it before). Safe to call many times. */
export function armSoundUnlock(): void {
  if (unlockArmed) return;
  unlockArmed = true;
  const unlock = (): void => {
    ensureContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function ensureContext(): AudioContext | null {
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** True when the player turned the casino sound off. */
export function isMuted(): boolean {
  return muted;
}

/** Turns the sound on or off and remembers the choice. */
export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // storage blocked: the choice lasts for this session only
  }
  if (master && context) master.gain.setValueAtTime(value ? 0 : 0.5, context.currentTime);
}

/** A small button that toggles the sound (speaker icon). */
export function muteButton(): HTMLButtonElement {
  const button = el('button', { class: 'fx-mute', type: 'button' });
  const paint = (): void => {
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
  };
  button.addEventListener('click', () => {
    setMuted(!muted);
    ensureContext();
    paint();
  });
  paint();
  return button;
}

// -----------------------------------------------
// VOICES
// -----------------------------------------------

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'square', volume = 0.15, slideTo?: number): void {
  const ctx = ensureContext();
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noise(start: number, duration: number, volume = 0.2, lowpass = 800): void {
  const ctx = ensureContext();
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(master);
  source.start(t);
}

const C_MAJOR = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

/** Each machine's reel sound: classic ticks, wooden door clacks, a snake rattle, harp notes. */
export type SpinVoice = 'classic' | 'door' | 'medusa' | 'book';

const SPIN_VOICES: Record<SpinVoice, { everyMs: number; play: (step: number) => void }> = {
  classic: { everyMs: 75, play: (step) => tone(step % 2 === 0 ? 1400 : 1100, 0, 0.03, 'square', 0.04) },
  door: {
    everyMs: 90,
    play: (step) => {
      tone(step % 2 === 0 ? 320 : 260, 0, 0.05, 'triangle', 0.12, 180);
      noise(0, 0.025, 0.06, 1500);
    },
  },
  medusa: {
    everyMs: 70,
    play: (step) => {
      noise(0, 0.035, step % 3 === 0 ? 0.1 : 0.05, 7000);
      if (step % 4 === 0) tone(110, 0, 0.06, 'sine', 0.08);
    },
  },
  book: {
    everyMs: 110,
    play: (step) => tone([C_MAJOR[0], C_MAJOR[2], C_MAJOR[4], C_MAJOR[5], C_MAJOR[4], C_MAJOR[2]][step % 6] * 2, 0, 0.12, 'sine', 0.05),
  },
};

/** Starts the reel spin loop in the machine's voice. Returns a function that stops it. */
export function playSpinLoop(voice: SpinVoice = 'classic'): () => void {
  const { everyMs, play } = SPIN_VOICES[voice];
  let step = 0;
  const id = window.setInterval(() => play(step++), everyMs);
  return () => window.clearInterval(id);
}

/** A reel landing: low thunk. `index` raises the pitch slightly reel after reel. */
export function playReelStop(index = 0): void {
  tone(160 + index * 18, 0, 0.12, 'triangle', 0.35, 70);
  noise(0, 0.06, 0.25, 600);
}

/** A short happy jingle for a small win. */
export function playSmallWin(): void {
  [0, 2, 4].forEach((n, i) => tone(C_MAJOR[n], i * 0.08, 0.14, 'square', 0.12));
}

/** Fanfare for a big win; `tier` 1..3 makes it longer and higher. */
export function playBigWin(tier = 1): void {
  const notes = [0, 2, 4, 7, 4, 7];
  for (let k = 0; k < tier; k++) {
    notes.forEach((n, i) => {
      const at = k * 0.55 + i * 0.09;
      tone(C_MAJOR[n] * (1 + k * 0.5), at, 0.2, 'square', 0.12);
      tone((C_MAJOR[n] / 2) * (1 + k * 0.5), at, 0.2, 'triangle', 0.1);
    });
  }
  tone(C_MAJOR[7] * (1 + (tier - 1) * 0.5), tier * 0.55, 0.7, 'sawtooth', 0.1);
}

/** One coin counting tick (call it repeatedly while a counter climbs). */
export function playCoinTick(): void {
  tone(1800 + Math.random() * 600, 0, 0.05, 'sine', 0.1);
}

/** A coin landing in a Hold & Spin grid: a light chime, a heavy clang for a big one, a fanfare for a jackpot. */
export function playCoinLand(size: 'small' | 'big' | 'jackpot'): void {
  if (size === 'small') {
    tone(C_MAJOR[4] * 2, 0, 0.12, 'sine', 0.14);
    tone(C_MAJOR[7] * 2, 0.05, 0.16, 'sine', 0.1);
    return;
  }
  if (size === 'big') {
    tone(140, 0, 0.3, 'triangle', 0.35, 60);
    noise(0, 0.12, 0.3, 900);
    [0, 4, 7].forEach((n, i) => tone(C_MAJOR[n] * 2, 0.06 + i * 0.06, 0.25, 'square', 0.1));
    return;
  }
  playBonusTrigger();
}

/** A fish takes the float: a watery plop, then the reel's quick clicks. */
export function playFishBite(): void {
  noise(0, 0.18, 0.35, 700);
  tone(520, 0, 0.12, 'sine', 0.22, 140);
  for (let i = 0; i < 5; i++) tone(2200 - i * 120, 0.16 + i * 0.045, 0.025, 'square', 0.06);
}

/** One step of a tally: each call `step` plays a little higher. */
export function playTallyNote(step: number): void {
  tone(C_MAJOR[step % 8] * 2 ** Math.floor(step / 8), 0, 0.12, 'square', 0.08);
}

/** Rising sweep for a bonus or jackpot trigger. */
export function playBonusTrigger(): void {
  tone(220, 0, 0.6, 'sawtooth', 0.12, 1760);
  [0, 2, 4, 7].forEach((n, i) => tone(C_MAJOR[n] * 2, 0.5 + i * 0.07, 0.25, 'square', 0.1));
}

/**
 * Suspense while a bonus reel slows down: a climbing arpeggio that speeds up over
 * `durationMs`, over a swelling whoosh. Returns a function that cuts it short;
 * follow it with playSuspenseHit or playSuspenseMiss.
 */
export function playSuspense(durationMs: number): () => void {
  const ctx = ensureContext();
  if (!ctx || !master || muted) return () => {};
  const t = ctx.currentTime;
  const seconds = durationMs / 1000;
  const end = t + seconds;
  // Everything goes through one bus, so the stop can fade notes already scheduled.
  const bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(master);

  // Whoosh: noise through a lowpass that opens and swells up to the landing.
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, t);
  filter.frequency.exponentialRampToValueAtTime(5000, end);
  const swell = ctx.createGain();
  swell.gain.setValueAtTime(0.0001, t);
  swell.gain.exponentialRampToValueAtTime(0.12, end);
  source.connect(filter).connect(swell).connect(bus);
  source.start(t);

  // Arpeggio: up the major scale, notes closer and closer, ever higher.
  let at = 0;
  let gap = 0.16;
  let step = 0;
  while (at < seconds - 0.03) {
    const octave = Math.floor(step / C_MAJOR.length);
    const freq = C_MAJOR[step % C_MAJOR.length] * 2 ** octave;
    const start = t + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.05 + 0.05 * (at / seconds), start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
    osc.connect(g).connect(bus);
    osc.start(start);
    osc.stop(start + 0.1);
    at += gap;
    gap = Math.max(0.045, gap * 0.88);
    step++;
  }

  return () => {
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    source.stop(now + 0.06);
  };
}

/** Doors swinging open: a wooden creak, a draught of air, then a magic shimmer. `delay` in seconds. */
export function playDoorOpen(delay = 0): void {
  // Creak: a rough, wobbling low saw sliding up then down.
  tone(140, delay, 0.35, 'sawtooth', 0.06, 260);
  tone(260, delay + 0.33, 0.3, 'sawtooth', 0.05, 180);
  noise(delay + 0.05, 0.6, 0.18, 1200);
  // Shimmer: a fast glissando of high bell notes as the light comes through.
  [0, 2, 4, 5, 7].forEach((n, i) => tone(C_MAJOR[n] * 4, delay + 0.55 + i * 0.05, 0.35, 'sine', 0.07));
}

/** Medusa awakes: a long snake hiss, a stone rumble, then a low, eerie chord. `delay` in seconds. */
export function playMedusaAwake(delay = 0): void {
  noise(delay, 0.9, 0.22, 7000);
  noise(delay + 0.15, 0.6, 0.12, 9000);
  tone(55, delay + 0.2, 0.9, 'triangle', 0.4, 40);
  noise(delay + 0.2, 0.7, 0.3, 200);
  [0, 2, 5].forEach((n) => tone(C_MAJOR[n] / 2, delay + 0.7, 1.1, 'sawtooth', 0.045));
  tone(C_MAJOR[7] * 2, delay + 0.75, 0.9, 'sine', 0.06, C_MAJOR[6] * 2);
}

/** The book opens: pages flicking, then a rising magic chime. `delay` in seconds. */
export function playBookOpen(delay = 0): void {
  for (let i = 0; i < 6; i++) noise(delay + i * 0.06, 0.05, 0.16, 3000 + i * 400);
  [0, 2, 4, 7, 4, 7].forEach((n, i) => tone(C_MAJOR[n] * 2, delay + 0.4 + i * 0.07, 0.4, 'sine', 0.08));
  tone(C_MAJOR[7] * 4, delay + 0.85, 0.7, 'triangle', 0.06);
}

/** The suspense resolves well: a bright strike and a sparkling chord. */
export function playSuspenseHit(): void {
  noise(0, 0.12, 0.35, 4000);
  tone(130, 0, 0.25, 'triangle', 0.35, 60);
  [0, 2, 4, 7].forEach((n) => tone(C_MAJOR[n] * 2, 0.02, 0.45, 'square', 0.07));
  [7, 4, 7].forEach((n, i) => tone(C_MAJOR[n] * 4, 0.12 + i * 0.06, 0.12, 'sine', 0.08));
}

/** The suspense falls flat: a soft, sad slide down. */
export function playSuspenseMiss(): void {
  tone(C_MAJOR[4], 0, 0.22, 'triangle', 0.12, C_MAJOR[2]);
  tone(C_MAJOR[2], 0.2, 0.4, 'triangle', 0.1, C_MAJOR[0] / 1.5);
}

/** An empty respin in a Hold & Spin: a falling two-note "bonk", as loud as the coin sounds. */
export function playRespinMiss(): void {
  tone(330, 0, 0.16, 'square', 0.16, 250);
  tone(220, 0.14, 0.3, 'triangle', 0.3, 140);
  noise(0.14, 0.08, 0.15, 500);
}

/** Dull buzz for a losing spin (kept very quiet). */
export function playLose(): void {
  tone(200, 0, 0.18, 'triangle', 0.08, 150);
}
