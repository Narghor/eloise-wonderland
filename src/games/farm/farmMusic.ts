import day1 from './music/day-1.mp3?url';
import day2 from './music/day-2.mp3?url';
import night1 from './music/night-1.mp3?url';
import night2 from './music/night-2.mp3?url';

// -----------------------------------------------
// THE FARM'S MUSIC: two tunes for the day, two for the evening, one after the other
// -----------------------------------------------
// Played through Web Audio, not the audio element's own volume: Safari on iPhone ignores that volume, so neither
// the slider nor the fades would work there. Music made by Flo with Suno (paid plan): music/CREDITS.md.

const VOLUME_KEY = 'farm-music-volume';
const DEFAULT_VOLUME = 0.5;
/** The loudest the music goes, under the sound effects. */
const MAX_GAIN = 0.6;
const FADE_S = 2.5;
/** Day tunes from this hour, evening tunes from that one. */
const DAY_FROM = 7;
const NIGHT_FROM = 19;

const DAY = [day1, day2];
const NIGHT = [night1, night2];

export function musicVolume(): number {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved === null ? DEFAULT_VOLUME : Math.min(1, Math.max(0, Number(saved) || 0));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export class FarmMusic {
  private readonly audio = new Audio();
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private volume = musicVolume();
  private index = Math.floor(Math.random() * 2);
  private fadingOut = false;
  private readonly onHidden = () => (document.hidden ? this.audio.pause() : this.resume());

  constructor() {
    this.audio.preload = 'auto';
    this.audio.addEventListener('timeupdate', () => this.nearEnd());
    this.audio.addEventListener('ended', () => this.next());
    document.addEventListener('visibilitychange', this.onHidden);
  }

  /** Starts on the player's first touch: browsers only let sound begin after a gesture. */
  start(): void {
    if (this.volume === 0 || !this.ensureContext()) return;
    if (!this.audio.src) this.load();
    this.resume();
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // storage blocked: the choice lasts for this session only
    }
    if (this.volume === 0) {
      this.audio.pause();
      return;
    }
    this.start();
    if (this.gain && this.context && !this.fadingOut) this.gain.gain.setTargetAtTime(this.volume * MAX_GAIN, this.context.currentTime, 0.1);
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.onHidden);
    this.audio.pause();
    this.audio.removeAttribute('src');
    void this.context?.close();
  }

  private ensureContext(): boolean {
    if (this.context) return true;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    this.context = new Ctor();
    this.gain = this.context.createGain();
    this.gain.gain.value = 0;
    this.context.createMediaElementSource(this.audio).connect(this.gain).connect(this.context.destination);
    return true;
  }

  /** The next tune of the hour's list: the day ones by day, the evening ones at night. */
  private load(): void {
    const hour = new Date().getHours();
    const list = hour >= DAY_FROM && hour < NIGHT_FROM ? DAY : NIGHT;
    this.index = (this.index + 1) % list.length;
    this.audio.src = list[this.index];
  }

  private resume(): void {
    if (this.volume === 0 || document.hidden || !this.context || !this.gain) return;
    void this.context.resume();
    this.audio.play().then(
      () => this.fadeTo(this.volume * MAX_GAIN),
      () => {
        // Not allowed yet (no gesture): the next touch starts it.
      },
    );
  }

  /** A soft fade a few seconds before a tune ends, so the next one never starts on a cut. */
  private nearEnd(): void {
    const left = this.audio.duration - this.audio.currentTime;
    if (this.fadingOut || !Number.isFinite(left) || left > FADE_S) return;
    this.fadingOut = true;
    this.fadeTo(0);
  }

  private next(): void {
    this.fadingOut = false;
    this.load();
    this.resume();
  }

  private fadeTo(target: number): void {
    if (!this.gain || !this.context) return;
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(target, now + FADE_S);
  }
}
