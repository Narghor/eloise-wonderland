import { el } from '../../dom';
import { prefersReducedMotion } from '../casino/fx/effects';
import { itemIcon, spriteImage, uiIcon, type Sprite } from './farmArt';
import type { FarmHud } from './farmHud';
import type { Gain } from './farmProduction';
import type { PlacedObject } from './farmSave';
import type { FarmScene } from './farmScene';

// -----------------------------------------------
// FEEDBACK: floating numbers, products flying to the barn, Eloisette rain, toasts
// -----------------------------------------------
// HTML laid over the map. Transform and opacity only: nothing else animates smoothly on a phone.

export class FarmFeedback {
  /** The toast stack; the screen places it between the top band and the bottom bar. */
  readonly toasts = el('div', { class: 'farm-toasts', role: 'status' });
  private readonly root: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly scene: FarmScene;
  private readonly hud: FarmHud;
  private comboEl: HTMLElement | null = null;

  constructor(root: HTMLElement, overlay: HTMLElement, scene: FarmScene, hud: FarmHud) {
    this.root = root;
    this.overlay = overlay;
    this.scene = scene;
    this.hud = hud;
  }

  /** The middle of an object, in screen pixels of the farm. */
  screenOf(o: PlacedObject): { x: number; y: number } {
    const a = this.scene.anchorOf(o);
    return { x: a.x, y: (a.top + a.bottom) / 2 };
  }

  float(at: { x: number; y: number }, text: string, icon?: Sprite): void {
    const node = el('div', { class: 'farm-float' }, ...(icon ? [spriteImage(icon, 2)] : []), text);
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y}px`;
    this.overlay.append(node);
    window.setTimeout(() => node.remove(), 1150);
  }

  /** "+3" and "+2 XP" over the object; a product also flies to the barn button. */
  gain(o: PlacedObject, gain: Gain): void {
    const at = this.screenOf(o);
    const icon = gain.item === 'nuts' ? uiIcon('nut') : itemIcon(gain.item);
    this.float(at, `+${gain.count}`, icon);
    if (gain.xp > 0) window.setTimeout(() => this.float({ x: at.x, y: at.y - 18 }, `+${gain.xp} XP`, uiIcon('star')), 220);
    if (gain.item !== 'nuts') this.flyToBarn(at, icon);
  }

  /** A short message under the top band; the same one twice replaces itself, three at most on screen. */
  toast(text: string): void {
    for (const old of this.toasts.children) if (old.textContent === text) old.remove();
    while (this.toasts.children.length >= 3) this.toasts.firstElementChild!.remove();
    const node = el('div', { class: 'farm-toast farm-box', text });
    this.toasts.append(node);
    window.setTimeout(() => node.remove(), 3300);
  }

  /** "×5 !" growing over a harvest swipe. */
  combo(field: PlacedObject, count: number): void {
    const at = this.screenOf(field);
    this.comboEl?.remove();
    const node = el('div', { class: `farm-combo${count >= 10 ? ' is-big' : ''}`, text: `×${count} !` });
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y - 26}px`;
    this.overlay.append(node);
    this.comboEl = node;
    window.setTimeout(() => node.remove(), 900);
  }

  /** Eloisettes falling into the purse at the top. */
  rainNuts(count: number): void {
    if (prefersReducedMotion()) return;
    const box = this.root.getBoundingClientRect();
    const target = this.hud.nutsTarget();
    const tx = target.left - box.left + target.width / 2 - 12;
    const ty = target.top - box.top + target.height / 2 - 12;
    for (let i = 0; i < count; i++) {
      const node = spriteImage(uiIcon('nut'), 3);
      node.classList.add('farm-fly');
      const sx = box.width * (0.3 + Math.random() * 0.4);
      const sy = box.height * (0.45 + Math.random() * 0.15);
      node.style.transform = `translate(${sx}px, ${sy}px)`;
      node.style.transitionDelay = `${i * 60}ms`;
      this.overlay.append(node);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        node.style.transform = `translate(${tx}px, ${ty}px) scale(0.6)`;
        node.style.opacity = '0.3';
      }));
      window.setTimeout(() => node.remove(), 800 + i * 60);
    }
  }

  private flyToBarn(at: { x: number; y: number }, icon: Sprite): void {
    const box = this.root.getBoundingClientRect();
    const target = this.hud.barnTarget();
    const node = spriteImage(icon, 3);
    node.classList.add('farm-fly');
    node.style.transform = `translate(${at.x - 12}px, ${at.y - 12}px)`;
    this.overlay.append(node);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        node.style.transform = `translate(${target.left - box.left + target.width / 2 - 12}px, ${target.top - box.top + target.height / 2 - 12}px) scale(0.6)`;
        node.style.opacity = '0.2';
      }),
    );
    window.setTimeout(() => node.remove(), 700);
  }
}

/** Paper confetti falling over a box (transform and opacity only). */
export function confetti(host: HTMLElement, count: number): void {
  if (prefersReducedMotion()) return;
  const colours = ['#f48fb1', '#ffd84a', '#7cc456', '#6a9fd8', '#b9a2ff', '#ff9f5a'];
  for (let i = 0; i < count; i++) {
    const bit = el('i', { class: 'farm-confetti', 'aria-hidden': 'true' });
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colours[i % colours.length];
    bit.style.animationDelay = `${Math.random() * 300}ms`;
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 80}px`);
    bit.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 720)}deg`);
    host.append(bit);
    window.setTimeout(() => bit.remove(), 2000);
  }
}
