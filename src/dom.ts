type Props = { class?: string; text?: string; [attribute: string]: string | undefined };

/** Creates an element; `class` and `text` are shortcuts, every other prop becomes an attribute. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

export interface BackLink {
  href: string;
  label: string;
}

export const BACK_HOME: BackLink = { href: '#/', label: 'Jeux' };
export const BACK_GARDEN: BackLink = { href: '#/jardin', label: 'Jardin' };

/** Shared top bar: a back link, a title, and an optional element on the right. */
export function topBar(title: string, right?: HTMLElement, back: BackLink = BACK_HOME): HTMLElement {
  return el(
    'header',
    { class: 'top-bar' },
    el('a', { class: 'back-link', href: back.href }, `‹ ${back.label}`),
    el('h1', { class: 'top-bar-title', text: title }),
    right ?? el('span'),
  );
}
