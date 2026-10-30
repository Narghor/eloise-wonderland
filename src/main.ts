import './style.css';
import { renderHome } from './home';
import { renderPicross } from './games/picross/picrossScreen';
import { renderColoring } from './games/coloring/coloringScreen';
import { renderGarden } from './games/garden/gardenScreen';
import { renderSand } from './games/sand/sandScreen';
import { renderGlass } from './games/stainedGlass/glassScreen';
import { renderBubbles } from './games/bubbles/bubbleScreen';
import { renderIcing } from './games/icing/icingScreen';
import { renderPotions } from './games/potions/potionScreen';
import { renderCompanion } from './companion/companionScreen';
import { renderDaily } from './daily/dailyScreen';
import { renderBracelets } from './games/bracelets/braceletScreen';
import { renderEmbroidery } from './games/embroidery/embroideryScreen';
import { renderMosaic } from './games/mosaic/mosaicScreen';
import { renderBouquet } from './games/bouquet/bouquetScreen';
import { requestPersistentStorage } from './save';

/** A screen fills the root and returns what to undo when we leave it. `#/name/a/b` gives params [a, b]. */
type Screen = (root: HTMLElement, params: string[]) => () => void;

const routes: Record<string, Screen> = {
  '': renderHome,
  picross: renderPicross,
  jardin: renderGarden,
  colorier: renderColoring,
  sable: renderSand,
  vitrail: renderGlass,
  bulles: renderBubbles,
  glacage: renderIcing,
  fioles: renderPotions,
  compagnon: renderCompanion,
  defi: renderDaily,
  bracelets: renderBracelets,
  broderie: renderEmbroidery,
  mosaique: renderMosaic,
  bouquet: renderBouquet,
};

const root = document.querySelector<HTMLElement>('#app')!;
let leaveScreen: (() => void) | null = null;

function route(): void {
  leaveScreen?.();
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const screen = routes[name] ?? renderHome;
  root.replaceChildren();
  leaveScreen = screen(root, params);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
requestPersistentStorage();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
