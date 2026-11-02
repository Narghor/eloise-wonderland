import { el } from '../dom';
import { companionCanvas } from '../companion/companionArt';
import { findItem } from '../companion/catalog';
import { startCafe } from '../games/tea/teaScreen';
import { FURNITURE_ART, coinIcon, spriteCanvas } from './houseArt';
import { reputationStars } from './houseCafe';
import {
  CHAPTER_STARS,
  CHARACTERS,
  DISHES,
  FURNITURE,
  INGREDIENTS,
  IN_SEASON,
  KITCHEN_LEVELS,
  ORDER_STARS,
  PLANTS,
  POSES,
  ROOMS,
  SEASON_NAMES,
  STAPLES,
  STAPLE_PACK,
  currentSeason,
  dish,
  ingredient,
  plant,
  type Character,
  type DishId,
  type FurnitureId,
  type IngredientId,
  type RoomId,
  type Season,
} from './houseData';
import { foodIcon } from './houseFoodArt';
import {
  MINUTE_MS,
  availablePoses,
  buyFurniture,
  buyPlot,
  buyStaple,
  chaptersUnlocked,
  coins,
  cook,
  dishStars,
  harvest,
  openRoom,
  place,
  plotPrice,
  serve,
  sow,
  sowBlock,
  upgradeKitchen,
  water,
} from './houseLogic';
import { photoCard } from './houseScene';
import type { HouseSave } from './houseSave';

/** What a panel may ask of the screen. */
export interface PanelContext {
  save: HouseSave;
  /** Saves, redraws the panel, and the scene when `scene` is true. */
  commit(scene?: boolean): void;
  say(text: string): void;
  readChapter(c: Character, chapter: number): void;
  eat(characterId: string): void;
}

export type PanelId = RoomId | 'album';

const ROOM_ICONS: Record<RoomId, string> = {
  living: '🛋️',
  kitchen: '🍳',
  cafe: '☕',
  garden: '🌱',
  bedroom: '🛏️',
  library: '📚',
  greenhouse: '🪴',
};

const ROOM_GUIDES: Record<RoomId, string> = {
  living: 'Tes visiteurs se promènent dans la maison. Quand l’un d’eux prend la pose ✨, touche-le quand le cercle doré rejoint le viseur en pointillés : le viseur brille, c’est le moment de la photo.',
  kitchen: 'Mets des aliments dans la marmite puis « Cuisiner ». Un mélange qui ne donne rien ne coûte rien. Sers ensuite tes plats à tes visiteurs : ils gagnent de l’amitié.',
  cafe: 'Un service de thé de 90 secondes : tes amis viennent s’attabler parmi les clients.',
  garden: 'Dans le jardin, touche une parcelle vide pour choisir où planter, une plante 💧 pour l’arroser (elle pousse deux fois plus vite) et une plante mûre pour la récolter. Les plantes poussent même quand le site est fermé.',
  bedroom: 'Une pièce calme : certains visiteurs ne viennent que si elle est ouverte.',
  library: 'Une pièce studieuse : certains visiteurs ne viennent que si elle est ouverte.',
  greenhouse: 'Avec la serre, toutes les graines se sèment au jardin, même hors saison.',
};

const ROOM_PITCHES: Partial<Record<RoomId, string>> = {
  bedroom: 'Une pièce douillette à décorer. Elle attire des visiteurs qui ne viennent pas sans elle.',
  library: 'Des livres, un bureau, un télescope… Elle attire des visiteurs qui ne viennent pas sans elle.',
  greenhouse: 'Toutes les graines se sèment, même hors saison. Elle attire un visiteur qui aime le calme.',
};

const SEASON_ICONS: Record<Season, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };

export function panel(ctx: PanelContext, id: PanelId, now: number): HTMLElement[] {
  if (id === 'album') return albumPanel(ctx);
  const room = ROOMS.find((r) => r.id === id)!;
  if (!ctx.save.rooms.includes(id)) return lockedPanel(ctx, id);
  const title = el('h2', { class: 'house-panel-title', text: `${ROOM_ICONS[id]} ${room.name}` });
  const body =
    id === 'garden' ? gardenPart(ctx, now) : id === 'kitchen' ? kitchenPart(ctx, now) : id === 'cafe' ? cafePart(ctx) : id === 'living' ? livingPart(ctx) : [];
  // The guide comes last: a reminder, never between the player and the actions.
  return [title, ...body, ...(id === 'garden' ? [] : decorPart(ctx, id)), guide(ROOM_GUIDES[id])];
}

function guide(text: string): HTMLElement {
  return el('p', { class: 'house-guide' }, el('span', { 'aria-hidden': 'true', text: '💡' }), el('span', { text }));
}

function price(amount: number): HTMLElement {
  return el('span', { class: 'house-price' }, `${amount}`, coinIcon());
}

function sectionTitle(text: string): HTMLElement {
  return el('h3', { class: 'house-section', text });
}

// -----------------------------------------------
// LOCKED ROOM
// -----------------------------------------------

function lockedPanel(ctx: PanelContext, id: RoomId): HTMLElement[] {
  const room = ROOMS.find((r) => r.id === id)!;
  const open = el('button', { class: 'button', type: 'button' }, 'Ouvrir pour ', price(room.price));
  open.addEventListener('click', () => {
    if (!confirm(`Ouvrir la pièce « ${room.name} » pour ${room.price} pièces ?`)) return;
    if (openRoom(ctx.save, id)) ctx.say(`${room.name} ouverte ! De nouveaux visiteurs pourraient venir.`);
    else ctx.say(`Il te manque ${room.price - coins()} pièces.`);
    ctx.commit(true);
  });
  return [el('h2', { class: 'house-panel-title', text: `🔒 ${room.name}` }), el('p', { class: 'house-pitch', text: ROOM_PITCHES[id] ?? '' }), open];
}

// -----------------------------------------------
// LIVING ROOM AND CAFE
// -----------------------------------------------

function livingPart(ctx: PanelContext): HTMLElement[] {
  const count = ctx.save.gifts.length;
  if (count === 0) return [];
  return [el('p', { class: 'house-note', text: `🎁 ${count} cadeau${count > 1 ? 'x' : ''} t’attend${count > 1 ? 'ent' : ''} dans le salon : touche-les dans la pièce pour les ouvrir.` })];
}

function cafePart(ctx: PanelContext): HTMLElement[] {
  const open = el('button', { class: 'button house-cafe-open', type: 'button', text: 'Ouvrir le café' });
  open.addEventListener('click', startCafe);
  return [
    el(
      'div',
      { class: 'house-cafe-sign' },
      el('div', { class: 'house-cafe-awning' }),
      el(
        'div',
        { class: 'house-cafe-body' },
        el('strong', { class: 'house-cafe-name', text: 'Le Petit Café' }),
        el('span', { class: 'house-cafe-rep', text: reputationStars(ctx.save.cafeLevel), 'aria-label': `Réputation ${ctx.save.cafeLevel + 1} sur 5` }),
        el('p', { text: 'Sers le thé à tes clients. Chaque ami servi gagne +1 ♥, et un service parfait (3 étoiles) fait grandir la réputation : plus de thés, plus de clients.' }),
        open,
      ),
    ),
  ];
}

// -----------------------------------------------
// GARDEN
// -----------------------------------------------

let choosingPlot: number | null = null;

/** A bed touched in the garden view: picks it for the next seed when empty, waters it, or harvests it. */
export function touchPlot(ctx: PanelContext, index: number): 'choose' | 'done' {
  const plot = ctx.save.plots[index];
  if (plot === undefined) return 'done';
  if (plot === null) {
    choosingPlot = index;
    ctx.commit();
    return 'choose';
  }
  if (!plot.watered && water(ctx.save, index, Date.now())) {
    ctx.say(`${plant(plot.plant).name} arrosée : elle pousse deux fois plus vite !`);
    ctx.commit();
    return 'done';
  }
  const count = harvest(ctx.save, index, Date.now());
  if (count > 0) {
    ctx.say(`+${count} ${plant(plot.plant).name.toLowerCase()} au garde-manger`);
    ctx.commit(true);
  }
  return 'done';
}

/** The empty plot the next seed goes into: the one touched, else the first free one; -1 when none. */
export function seedTarget(save: HouseSave): number {
  if (choosingPlot !== null && save.plots[choosingPlot] !== null) choosingPlot = null;
  return choosingPlot ?? save.plots.findIndex((plot) => plot === null);
}

function gardenPart(ctx: PanelContext, now: number): HTMLElement[] {
  const { save } = ctx;
  const target = seedTarget(save);
  const free = target >= 0;
  const season = currentSeason(new Date(now));

  const seeds = PLANTS.filter((p) => !p.rare || (save.seeds[p.id] ?? 0) > 0).map((p) => {
    const block = sowBlock(save, p.id, now);
    const detail =
      block === 'season'
        ? el('small', { class: 'house-seed-off', text: `${SEASON_ICONS[p.seasons![0]]} ${SEASON_NAMES[p.seasons![0]]}` })
        : el('small', {}, ...(p.rare ? [`graine rare ×${save.seeds[p.id]}`] : [price(p.price), ` · ${duration(p.growMinutes * MINUTE_MS)}`]));
    const button = el('button', { class: `house-seed${p.rare ? ' is-rare' : ''}`, type: 'button' }, foodIcon(p.id, 30), el('span', { text: p.name }), detail);
    button.disabled = block !== null || !free;
    button.addEventListener('click', () => {
      const refusal = sow(save, target, p.id, Date.now());
      if (refusal) {
        ctx.say(refusal === 'coins' ? 'Pas assez de pièces.' : 'Pas maintenant : la serre permet de semer hors saison.');
        return;
      }
      choosingPlot = null;
      ctx.say(`${p.name} plantée !`);
      ctx.commit(true);
    });
    return button;
  });

  const status = free
    ? 'Touche une graine : elle pousse dans la parcelle marquée « ici » au-dessus. Touche une autre parcelle vide pour changer.'
    : 'Toutes les parcelles sont occupées : récolte tes plantes, ou achète une nouvelle parcelle.';
  const parts: HTMLElement[] = [
    el('p', { class: 'house-garden-status', text: status }),
    sectionTitle(`Graines · ${SEASON_ICONS[season]} ${SEASON_NAMES[season]}`),
    el('div', { class: 'house-seeds' }, ...seeds),
  ];
  if (!save.rooms.includes('greenhouse')) parts.push(el('p', { class: 'house-note', text: 'Les graines grisées attendent leur saison. La serre permet de les planter quand même.' }));
  const plotCost = plotPrice(save);
  if (plotCost !== null) {
    const more = el('button', { class: 'button button-secondary', type: 'button' }, 'Nouvelle parcelle · ', price(plotCost));
    more.addEventListener('click', () => {
      if (!buyPlot(save)) ctx.say('Pas assez de pièces.');
      ctx.commit(true);
    });
    parts.push(more);
  }
  return parts;
}

// -----------------------------------------------
// KITCHEN
// -----------------------------------------------

let pot: IngredientId[] = [];
let kitchenExtra: 'grocery' | 'recipes' | null = null;

function kitchenPart(ctx: PanelContext, now: number): HTMLElement[] {
  const { save } = ctx;
  const level = KITCHEN_LEVELS[save.kitchenLevel];
  const parts: HTMLElement[] = [];

  if (save.order && save.visitors.includes(save.order.visitor)) {
    const who = CHARACTERS.find((c) => c.id === save.order!.visitor)!;
    const wanted = dish(save.order.dish);
    const have = (save.dishes[wanted.id] ?? 0) > 0 ? ' Tu en as un de prêt !' : '';
    parts.push(
      el(
        'div',
        { class: 'house-order' },
        companionCanvas(who.look, 40),
        el('span', {}, el('strong', { text: `📋 ${who.name} aimerait : ${wanted.name}` }), el('small', { text: `+${ORDER_STARS} ♥ en bonus si tu le sers pendant sa visite.${have}` })),
      ),
    );
  }

  // The pot: tap pantry slots to fill it, tap a filled place to take the food back.
  pot = pot.filter((id, i) => pot.slice(0, i + 1).filter((x) => x === id).length <= (save.pantry[id] ?? 0)).slice(0, level.ingredients);
  const places = Array.from({ length: level.ingredients }, (_, i) => {
    const id = pot[i];
    const placeButton = el('button', { class: `house-pot-place${id ? ' is-filled' : ''}`, type: 'button', 'aria-label': id ? `Retirer ${ingredient(id).name}` : 'Place libre' }, ...(id ? [foodIcon(id, 30)] : []));
    placeButton.disabled = !id;
    placeButton.addEventListener('click', () => {
      pot.splice(i, 1);
      ctx.commit();
    });
    return placeButton;
  });
  const cookButton = el('button', { class: 'button', type: 'button', text: 'Cuisiner' });
  cookButton.disabled = pot.length < 2;
  cookButton.addEventListener('click', () => {
    const result = cook(save, pot, Date.now());
    if (result.ok) {
      ctx.say(result.discovered ? `Nouvelle recette : ${dish(result.dish).name} !` : `${dish(result.dish).name} au feu !`);
      pot = [];
    } else ctx.say(COOK_REFUSALS[result.reason]);
    ctx.commit(true);
  });
  parts.push(el('div', { class: 'house-pot' }, el('strong', { text: 'Marmite' }), el('div', { class: 'house-pot-places' }, ...places), cookButton));

  if (save.cooking.length > 0) {
    parts.push(
      el(
        'div',
        { class: 'house-burners' },
        ...save.cooking.map((c) => el('span', { class: 'house-burner' }, `🔥 ${dish(c.dish).name} · ${c.readyAt <= now ? 'prêt !' : duration(c.readyAt - now)}`)),
        el('small', { text: `${level.burners - save.cooking.length} feu${level.burners - save.cooking.length > 1 ? 'x' : ''} libre${level.burners - save.cooking.length > 1 ? 's' : ''}` }),
      ),
    );
  }

  parts.push(sectionTitle('Garde-manger'));
  const stocked = INGREDIENTS.filter((p) => (save.pantry[p.id] ?? 0) > 0);
  if (stocked.length === 0) parts.push(el('p', { class: 'house-note', text: 'Vide pour l’instant : récolte le jardin ou passe à l’épicerie.' }));
  else {
    const slots = stocked.map((p) => {
      const left = (save.pantry[p.id] ?? 0) - pot.filter((id) => id === p.id).length;
      const slot = el('button', { class: `house-slot is-${p.kind}`, type: 'button', title: p.name, 'aria-label': `${p.name}, ${left}` }, foodIcon(p.id, 30), el('span', { class: 'house-slot-name', text: p.name }), el('span', { class: 'house-slot-count', text: `${left}` }));
      slot.disabled = left <= 0 || pot.length >= level.ingredients;
      slot.addEventListener('click', () => {
        pot.push(p.id);
        ctx.commit();
      });
      return slot;
    });
    parts.push(
      el('div', { class: 'house-inventory' }, ...slots),
      el('p', { class: 'house-legend' }, el('span', { class: 'is-garden', text: 'du jardin' }), el('span', { class: 'is-grocery', text: 'de l’épicerie' }), el('span', { class: 'is-rare', text: 'rare' })),
    );
  }

  const ready = DISHES.filter((d) => (save.dishes[d.id] ?? 0) > 0);
  if (ready.length > 0) {
    parts.push(sectionTitle('Plats prêts'));
    for (const d of ready) {
      const serveButton = el('button', { class: 'button', type: 'button', text: 'Servir' });
      serveButton.addEventListener('click', () => serveDish(ctx, d.id));
      parts.push(el('div', { class: 'house-dish' }, el('span', { class: 'house-dot', style: `background:${d.color}` }), el('span', {}, el('strong', { text: `${d.name} ×${save.dishes[d.id]}` }), el('small', { text: `+${dishStars(d)} ♥ à qui le mange` })), serveButton));
    }
  }
  if (save.table.length > 0) parts.push(el('p', { class: 'house-note', text: `Sur la table : ${save.table.map((id) => dish(id).name).join(', ')}. Les prochains visiteurs se régaleront.` }));

  const toggle = (id: 'grocery' | 'recipes', label: string) => {
    const button = el('button', { class: `button button-secondary${kitchenExtra === id ? ' is-on' : ''}`, type: 'button', text: label });
    button.addEventListener('click', () => {
      kitchenExtra = kitchenExtra === id ? null : id;
      ctx.commit();
    });
    return button;
  };
  const tools = el('div', { class: 'house-actions' }, toggle('grocery', '🛒 Épicerie'), toggle('recipes', `📖 Recettes ${save.known.length}/${DISHES.length}`));
  const nextLevel = KITCHEN_LEVELS[save.kitchenLevel + 1];
  if (nextLevel) {
    const upgrade = el('button', { class: 'button button-secondary', type: 'button' }, `⬆ ${nextLevel.name} · `, price(nextLevel.price));
    upgrade.addEventListener('click', () => {
      if (!confirm(`Améliorer la cuisine en « ${nextLevel.name} » pour ${nextLevel.price} pièces ? Plus de feux, des recettes à ${nextLevel.ingredients} ingrédients et de nouveaux rayons à l’épicerie.`)) return;
      if (upgradeKitchen(save)) ctx.say(`Nouvelle cuisine : ${nextLevel.name} !`);
      else ctx.say('Pas assez de pièces.');
      ctx.commit();
    });
    tools.append(upgrade);
  }
  parts.push(tools);
  if (kitchenExtra === 'grocery') parts.push(...groceryPart(ctx));
  if (kitchenExtra === 'recipes') parts.push(recipeBook(save));
  return parts;
}

function groceryPart(ctx: PanelContext): HTMLElement[] {
  const { save } = ctx;
  const shelves = STAPLES.filter((s) => s.level <= save.kitchenLevel).map((s) => {
    const button = el('button', { class: 'house-seed', type: 'button' }, foodIcon(s.id, 30), el('span', { text: s.name }), el('small', {}, `×${STAPLE_PACK} · `, price(s.price)));
    button.addEventListener('click', () => {
      ctx.say(buyStaple(save, s.id) ? `+${STAPLE_PACK} ${s.name.toLowerCase()} au garde-manger` : 'Pas assez de pièces.');
      ctx.commit();
    });
    return button;
  });
  const later = KITCHEN_LEVELS.slice(save.kitchenLevel + 1)
    .map((level, i) => {
      const names = STAPLES.filter((s) => s.level === save.kitchenLevel + 1 + i).map((s) => s.name.toLowerCase());
      return names.length > 0 ? `Avec « ${level.name} » : ${names.join(', ')}.` : '';
    })
    .filter(Boolean);
  return [
    sectionTitle('Épicerie'),
    el('p', { class: 'house-note', text: 'Le jardin donne le frais, l’épicerie le reste. Les plats qui en utilisent rapportent plus d’amitié.' }),
    el('div', { class: 'house-seeds' }, ...shelves),
    ...later.map((line) => el('p', { class: 'house-note', text: line })),
  ];
}

function recipeBook(save: HouseSave): HTMLElement {
  const unknown = DISHES.length - save.known.length;
  return el(
    'div',
    { class: 'house-recipes' },
    sectionTitle('Livre de recettes'),
    ...save.known.map((id) =>
      el('div', { class: 'house-recipe' }, el('strong', { text: dish(id).name }), el('span', { class: 'house-recipe-foods' }, ...dish(id).ingredients.map((p) => foodIcon(p, 22))), el('small', { text: `+${dishStars(dish(id))} ♥` })),
    ),
    el('p', { class: 'house-note', text: unknown > 0 ? `${unknown} recette${unknown > 1 ? 's' : ''} à découvrir : essaie des mélanges !` : 'Toutes les recettes sont découvertes !' }),
  );
}

const COOK_REFUSALS: Record<'nothing' | 'level' | 'missing' | 'busy', string> = {
  nothing: 'Ce mélange ne donne rien… Les aliments sont gardés, essaie autre chose !',
  level: 'Bonne idée, mais il faut une meilleure cuisine pour ce plat.',
  missing: 'Il manque des aliments.',
  busy: 'Tous les feux sont occupés.',
};

function serveDish(ctx: PanelContext, id: DishId): void {
  const result = serve(ctx.save, id);
  if (!result) {
    ctx.say('La table est pleine : attends les prochains visiteurs.');
    return;
  }
  if (result.eater === null) ctx.say('Personne à la maison : le plat attend sur la table.');
  else {
    const name = CHARACTERS.find((c) => c.id === result.eater)!.name;
    ctx.say(result.ordered ? `Commande servie à ${name} ! +${ORDER_STARS} ♥ en bonus` : result.favourite ? `${name} adore ce plat ! C’est le moment d’une photo !` : `${name} va goûter ton plat.`);
    if (result.newChapter) ctx.say(`${name} : chapitre ${result.newChapter} débloqué !`);
    ctx.eat(result.eater);
  }
  ctx.commit(true);
}

// -----------------------------------------------
// DECORATION (every open room)
// -----------------------------------------------

let decorSpot: { room: RoomId; spot: number } | null = null;

function decorPart(ctx: PanelContext, room: RoomId): HTMLElement[] {
  const { save } = ctx;
  const pieces = FURNITURE.filter((f) => f.room === room);
  const spots = save.placed[room].map((current, spot) => {
    const picking = decorSpot?.room === room && decorSpot.spot === spot;
    const button = el(
      'button',
      { class: `house-decor-spot${current ? '' : ' is-empty'}${picking ? ' is-active' : ''}`, type: 'button' },
      ...(current
        ? [spriteCanvas(FURNITURE_ART[current], 2), el('strong', { text: furnitureName(current) }), el('small', { text: `Pose : ${POSES[pieceOf(current).pose].name}` })]
        : [el('b', { text: '+' }), el('small', { text: 'Emplacement libre' })]),
    );
    button.addEventListener('click', () => {
      decorSpot = picking ? null : { room, spot };
      ctx.commit();
    });
    return button;
  });
  const parts: HTMLElement[] = [sectionTitle('Décoration'), el('div', { class: 'house-decor' }, ...spots)];
  if (decorSpot?.room === room) {
    const spot = decorSpot.spot;
    const choices = pieces.map((piece) => {
      const owned = save.owned.includes(piece.id);
      const button = el(
        'button',
        { class: 'house-seed', type: 'button' },
        spriteCanvas(FURNITURE_ART[piece.id], 1.6),
        el('span', { text: piece.name }),
        el('small', {}, ...(owned ? [save.placed[room][spot] === piece.id ? 'posé ici' : 'à toi'] : [price(piece.price)])),
      );
      button.addEventListener('click', () => {
        if (!owned) {
          if (!buyFurniture(save, piece.id)) {
            ctx.say('Pas assez de pièces.');
            return;
          }
          ctx.say(`${piece.name} : nouvelle pose « ${POSES[piece.pose].name} » !`);
        }
        place(save, room, spot, piece.id);
        decorSpot = null;
        ctx.commit(true);
      });
      return button;
    });
    const remove = el('button', { class: 'button button-secondary', type: 'button', text: 'Laisser vide' });
    remove.addEventListener('click', () => {
      place(save, room, spot, null);
      decorSpot = null;
      ctx.commit(true);
    });
    parts.push(el('div', { class: 'house-seeds' }, ...choices), remove);
  }
  return parts;
}

function pieceOf(id: FurnitureId) {
  return FURNITURE.find((f) => f.id === id)!;
}

function furnitureName(id: FurnitureId): string {
  return pieceOf(id).name;
}

// -----------------------------------------------
// ALBUM
// -----------------------------------------------

function albumPanel(ctx: PanelContext): HTMLElement[] {
  const { save } = ctx;
  const poses = availablePoses(save);
  const met = CHARACTERS.filter((c) => save.friends[c.id].met);
  const unknown = CHARACTERS.filter((c) => !save.friends[c.id].met);
  const cards = met.map((c) => {
    const friend = save.friends[c.id];
    const unlocked = chaptersUnlocked(friend.stars);
    const next = CHAPTER_STARS[unlocked];
    const previous = unlocked === 0 ? 0 : CHAPTER_STARS[unlocked - 1];
    const progress = next === undefined ? 1 : (friend.stars - previous) / (next - previous);
    const chapters = CHAPTER_STARS.map((_, index) => {
      const number = index + 1;
      const isNew = number <= unlocked && number > friend.chaptersRead;
      const button = el('button', { class: `house-chapter${isNew ? ' is-new' : ''}`, type: 'button', text: number <= unlocked ? `Chapitre ${number}` : `🔒 ${CHAPTER_STARS[index]} ♥` });
      button.disabled = number > unlocked;
      button.addEventListener('click', () => ctx.readChapter(c, number));
      return button;
    });
    const gift = findItem(c.gift);
    const photos = c.poses.map((pose) => {
      const card = photoCard(c, pose, friend.photos[pose] ?? 0);
      if (!friend.photos[pose] && !poses.has(pose)) {
        const needed = FURNITURE.find((f) => f.pose === pose);
        card.querySelector('small')!.textContent = needed ? `Il faut : ${needed.name.toLowerCase()}` : POSES[pose].name;
      }
      return card;
    });
    const favourite = unlocked >= 1 ? `Plat préféré : ${dish(c.favourite).name}` : 'Plat préféré : au chapitre 1';
    return el(
      'article',
      { class: 'house-card' },
      el(
        'div',
        { class: 'house-card-head' },
        companionCanvas(c.look, 56),
        el(
          'div',
          {},
          el('strong', { text: c.name }),
          el('small', { text: c.tagline }),
          el('span', { class: 'house-friendship', title: `${friend.stars} ♥` }, el('span', { style: `width:${Math.round(progress * 100)}%` })),
          el('small', { text: `${friend.stars} ♥ · ${favourite}` }),
        ),
      ),
      el('div', { class: 'house-photos' }, ...photos),
      el('div', { class: 'house-chapters' }, ...chapters),
      el('p', { class: 'house-gift-line', text: unlocked >= 3 ? `🎁 ${gift?.name ?? ''} : dans la garde-robe de ton compagnon !` : `🎁 Au chapitre 3 : ${gift?.name ?? 'un cadeau'}, introuvable en boutique` }),
    );
  });
  const parts: HTMLElement[] = [
    el('h2', { class: 'house-panel-title', text: '📖 Album' }),
    ...cards,
  ];
  if (unknown.length > 0) {
    parts.push(
      el(
        'article',
        { class: 'house-card is-unknown' },
        el('strong', { text: `Encore ${unknown.length} visiteur${unknown.length > 1 ? 's' : ''} à rencontrer` }),
        ...unknown.map((c) => el('div', { class: 'house-unknown-row' }, el('span', { class: 'house-silhouette', text: '?' }), el('small', { text: unknownHint(save, c) }))),
      ),
    );
  }
  parts.push(guide('Photographie tes visiteurs et sers-leur des plats pour gagner leur amitié (♥). L’amitié débloque leur histoire, puis un cadeau rare pour ton compagnon.'));
  return parts;
}

function unknownHint(save: HouseSave, c: Character): string {
  if (c.season) return `Ne vient qu’${IN_SEASON[c.season]}.`;
  const rooms = c.needs.filter((room) => !save.rooms.includes(room)).map(roomName);
  if (rooms.length > 0) return `Viendra quand ${list(rooms.map((r) => `« ${r} »`))} ${rooms.length > 1 ? 'seront ouvertes' : 'sera ouverte'}.`;
  return 'Passera peut-être à la prochaine visite.';
}

// -----------------------------------------------
// TEXT HELPERS
// -----------------------------------------------

export function duration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`;
}

function roomName(id: RoomId): string {
  return ROOMS.find((r) => r.id === id)!.name;
}

function list(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`;
}
