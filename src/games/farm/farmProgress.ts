import { todayKey } from '../../daily/daily';
import { mulberry32 } from '../../random';
import { ANIMALS, ANIMAL_IDS } from './data/animals';
import { BOOSTER_IDS } from './data/boosters';
import { CROPS } from './data/crops';
import { DAILY_TASKS, DAILY_TEMPLATES, dailyChestReward, dailyTaskReward } from './data/daily';
import { item } from './data/items';
import { RECIPES } from './data/machines';
import { MEDALS, medalReward } from './data/medals';
import { totalCharm } from './data/charm';
import { COPY_LEVELS, PLACEABLES, copyLevel, hasCopies, placeable } from './data/placeables';
import { PROJECTS, project } from './data/projects';
import { FAMILY_NAMES, SKINS } from './data/skins';
import { MAX_OPEN_QUESTS, QUESTS, quest, type Quest } from './data/quests';
import { MAX_LEVEL, levelReward, xpToNext } from './data/levels';
import type { AnimalId, FarmEvent, ItemId, Objective, PlaceableId, ProjectId, QuestId, Reward, Unlock } from './data/types';
import type { FarmSave } from './farmSave';

// -----------------------------------------------
// THE ONE UNLOCK RULE
// -----------------------------------------------

export function isUnlocked(save: FarmSave, unlock: Unlock): boolean {
  if ('level' in unlock) return save.level >= unlock.level;
  if ('quest' in unlock) return save.questsDone.includes(unlock.quest);
  return save.projectsDone.includes(unlock.project);
}

/** "niv. 7", "après une quête", "après le vieux pont": why a line is still closed. */
export function unlockText(unlock: Unlock): string {
  if ('level' in unlock) return `niv. ${unlock.level}`;
  if ('quest' in unlock) return 'après une quête';
  return `après ${project(unlock.project).name.toLowerCase()}`;
}

// -----------------------------------------------
// EVENTS AND COUNTERS
// -----------------------------------------------

/** The logic announces what happened; quests, daily tasks and medals all read these counters. */
export function emit(save: FarmSave, event: FarmEvent): void {
  const bump = (key: string) => (save.counters[key] = (save.counters[key] ?? 0) + event.count);
  bump(event.type);
  if (event.target) bump(`${event.type}:${event.target}`);
  if (event.kind) bump(`${event.type}:${event.kind}`);
}

export function counter(save: FarmSave, key: string): number {
  return save.counters[key] ?? 0;
}

// -----------------------------------------------
// MONEY, XP, STOCK
// -----------------------------------------------

export function earn(save: FarmSave, nuts: number): void {
  if (nuts <= 0) return;
  save.nuts += nuts;
  emit(save, { type: 'earn', count: nuts });
}

/** Takes the Eloisettes when there are enough; false otherwise, nothing taken. */
export function spend(save: FarmSave, nuts: number): boolean {
  if (save.nuts < nuts) return false;
  save.nuts -= nuts;
  return true;
}

/** Adds XP and climbs every level it reaches, paying each one's reward. */
export function gainXp(save: FarmSave, xp: number): void {
  save.xp += xp;
  for (let next = xpToNext(save.level); next !== null && save.xp >= next; next = xpToNext(save.level)) {
    save.xp -= next;
    save.level++;
    pay(save, levelReward(save.level));
  }
  if (save.level >= MAX_LEVEL) save.xp = Math.min(save.xp, 0);
}

export function have(save: FarmSave, id: ItemId): number {
  return save.stock[id] ?? 0;
}

export function addItem(save: FarmSave, id: ItemId, count: number): void {
  save.stock[id] = have(save, id) + count;
}

export function hasItems(save: FarmSave, items: Partial<Record<ItemId, number>>): boolean {
  return Object.entries(items).every(([id, n]) => have(save, id as ItemId) >= (n ?? 0));
}

export function takeItems(save: FarmSave, items: Partial<Record<ItemId, number>>): void {
  for (const [id, n] of Object.entries(items)) save.stock[id as ItemId] = have(save, id as ItemId) - (n ?? 0);
}

/** Pays any reward: the one way quests, levels, tasks, medals and projects give things. */
export function pay(save: FarmSave, reward: Reward): void {
  if (reward.nuts) earn(save, reward.nuts);
  if (reward.parcels) save.mail.waiting += reward.parcels;
  for (const [id, n] of Object.entries(reward.boosters ?? {})) save.boosters[id as keyof typeof save.boosters] += n ?? 0;
  for (const [id, n] of Object.entries(reward.decor ?? {})) save.decorStore[id as keyof typeof save.decorStore] = (save.decorStore[id as keyof typeof save.decorStore] ?? 0) + (n ?? 0);
  if (reward.xp) gainXp(save, reward.xp);
}

// -----------------------------------------------
// WHAT STANDS ON THE FARM
// -----------------------------------------------

/** Placeables of a type on the map, or animals of a kind in their pens. */
export function ownCount(save: FarmSave, id: PlaceableId | AnimalId): number {
  if ((ANIMAL_IDS as readonly string[]).includes(id)) {
    const pen = ANIMALS.find((a) => a.id === id)!.pen;
    return save.objects.filter((o) => o.type === pen).reduce((n, o) => n + (o.animals?.length ?? 0), 0);
  }
  return save.objects.filter((o) => o.type === id).length;
}

/** The farm's charm: what its decorations on the map add up to. */
export function charm(save: FarmSave): number {
  return totalCharm(save.objects.map((o) => o.type));
}

export function obstaclesLeft(save: FarmSave): number {
  return save.objects.filter((o) => placeable(o.type).kind === 'obstacle').length;
}

// -----------------------------------------------
// QUESTS
// -----------------------------------------------

export function objectiveProgress(save: FarmSave, objective: Objective, starts: Record<string, number>): number {
  const value = 'own' in objective ? ownCount(save, objective.own) : counter(save, objective.key) - (starts[objective.key] ?? 0);
  return Math.min(objective.count, Math.max(0, value));
}

export function openQuests(save: FarmSave): Quest[] {
  return QUESTS.filter((q) => q.id in save.questStarts);
}

export function isQuestReady(save: FarmSave, q: Quest): boolean {
  const starts = save.questStarts[q.id];
  return !!starts && q.objectives.every((o) => objectiveProgress(save, o, starts) >= o.count);
}

/** Opens the next quests of the story, two at most; returns the ones just opened. */
function openNextQuests(save: FarmSave): Quest[] {
  const opened: Quest[] = [];
  for (const q of QUESTS) {
    if (Object.keys(save.questStarts).length >= MAX_OPEN_QUESTS) break;
    if (save.questsDone.includes(q.id) || q.id in save.questStarts) continue;
    if (q.after && !save.questsDone.includes(q.after)) continue;
    if (!isUnlocked(save, q.unlock)) continue;
    const starts: Record<string, number> = {};
    for (const o of q.objectives) if ('key' in o) starts[o.key] = counter(save, o.key);
    save.questStarts[q.id] = starts;
    opened.push(q);
  }
  return opened;
}

export function claimQuest(save: FarmSave, id: QuestId): Quest | null {
  const q = quest(id);
  if (!q || !isQuestReady(save, q)) return null;
  delete save.questStarts[id];
  save.questsDone.push(id);
  pay(save, q.reward);
  return q;
}

// -----------------------------------------------
// GREAT PROJECTS
// -----------------------------------------------

export function projectState(save: FarmSave, id: ProjectId): { stage: number; given: Partial<Record<ItemId, number>> } {
  return save.projects[id] ?? { stage: 0, given: {} };
}

/** Gives what the barn has toward the current stage; returns how many items were given. */
export function giveToProject(save: FarmSave, id: ProjectId, itemId: ItemId): number {
  const p = project(id);
  const state = projectState(save, id);
  const stage = p.stages[state.stage];
  if (!stage || !isUnlocked(save, p.unlock)) return 0;
  const missing = (stage.items[itemId] ?? 0) - (state.given[itemId] ?? 0);
  const give = Math.min(missing, have(save, itemId));
  if (give <= 0) return 0;
  save.stock[itemId] = have(save, itemId) - give;
  state.given[itemId] = (state.given[itemId] ?? 0) + give;
  save.projects[id] = state;
  return give;
}

export function isStageFilled(save: FarmSave, id: ProjectId): boolean {
  const state = projectState(save, id);
  const stage = project(id).stages[state.stage];
  return !!stage && Object.entries(stage.items).every(([item, n]) => (state.given[item as ItemId] ?? 0) >= (n ?? 0));
}

/** Pays the stage's Eloisettes and closes it; the last stage completes the project. */
export function finishStage(save: FarmSave, id: ProjectId): boolean {
  const p = project(id);
  const state = projectState(save, id);
  const stage = p.stages[state.stage];
  if (!stage || !isStageFilled(save, id) || !spend(save, stage.nuts)) return false;
  save.projects[id] = { stage: state.stage + 1, given: {} };
  emit(save, { type: 'project', target: id, count: 1 });
  if (state.stage + 1 === p.stages.length) save.projectsDone.push(id);
  gainXp(save, stage.xp);
  return true;
}

// -----------------------------------------------
// THE SMALL TASKS OF THE DAY
// -----------------------------------------------

function ensureDaily(save: FarmSave, now: number): void {
  const day = todayKey(new Date(now));
  if (save.daily?.day === day) return;
  const eligible = DAILY_TEMPLATES.filter(
    (t) => save.level >= t.level && (!t.needs || ownCount(save, t.needs) > 0) && (!t.needsObstacles || obstaclesLeft(save) >= t.needsObstacles),
  );
  const random = mulberry32(hash(day));
  const picked = [...eligible].sort(() => random() - 0.5).slice(0, DAILY_TASKS);
  save.daily = {
    day,
    chestOpened: false,
    tasks: picked.map((t) => {
      const count = t.count(save.level);
      return { template: t.id, key: t.key, count, text: t.text(count), start: counter(save, t.key), paid: false };
    }),
  };
}

export function taskProgress(save: FarmSave, task: { key: string; count: number; start: number }): number {
  return Math.min(task.count, counter(save, task.key) - task.start);
}

export function isChestReady(save: FarmSave): boolean {
  return !!save.daily && !save.daily.chestOpened && save.daily.tasks.length > 0 && save.daily.tasks.every((t) => t.paid);
}

export function openChest(save: FarmSave): boolean {
  if (!isChestReady(save)) return false;
  save.daily!.chestOpened = true;
  pay(save, dailyChestReward(save.level));
  return true;
}

function hash(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// -----------------------------------------------
// SETTLE: after every action, what changed for the player
// -----------------------------------------------

export type Notice =
  | { kind: 'level'; level: number; reward: Reward; unlocks: string[] }
  | { kind: 'quest'; quest: Quest }
  | { kind: 'task'; text: string; reward: Reward }
  | { kind: 'medal'; name: string; tier: number; text: string; reward: Reward };

/** Pays what was earned (tasks, medals), opens what is due (quests, the day's tasks) and tells it, in order. */
export function settle(save: FarmSave, now: number): Notice[] {
  const notices: Notice[] = [];
  ensureDaily(save, now);
  for (const task of save.daily!.tasks) {
    if (task.paid || taskProgress(save, task) < task.count) continue;
    task.paid = true;
    const reward = dailyTaskReward(save.level);
    pay(save, reward);
    notices.push({ kind: 'task', text: task.text, reward });
  }
  for (const medal of MEDALS) {
    const paid = save.medals[medal.id] ?? 0;
    if (paid >= 3 || counter(save, medal.key) < medal.tiers[paid]) continue;
    save.medals[medal.id] = paid + 1;
    const reward = medalReward(paid as 0 | 1 | 2);
    pay(save, reward);
    notices.push({ kind: 'medal', name: medal.name, tier: paid, text: medal.text(medal.tiers[paid]), reward });
  }
  // Rewards above may have climbed a level: the level news come after them, then the quests they open.
  while (save.levelSeen < save.level) {
    save.levelSeen++;
    notices.push({ kind: 'level', level: save.levelSeen, reward: levelReward(save.levelSeen), unlocks: unlocksAt(save.levelSeen) });
  }
  for (const q of openNextQuests(save)) notices.push({ kind: 'quest', quest: q });
  return notices;
}

/** Everything a level opens, for its news. */
export function unlocksAt(level: number): string[] {
  const at = (u: Unlock) => 'level' in u && u.level === level;
  return [
    ...CROPS.filter((c) => at(c.unlock)).map((c) => `Culture : ${item(c.id).name}`),
    ...PLACEABLES.filter((p) => ['machine', 'pen', 'tree'].includes(p.kind) && at(p.unlock)).map((p) => `Bâtiment : ${p.name}`),
    // The cart is given, not bought: it says so.
    ...PLACEABLES.filter((p) => p.kind === 'cart' && at(p.unlock)).map((p) => `Offerte : ${p.name}, avec de grosses commandes`),
    ...PLACEABLES.filter(hasCopies).flatMap((p) =>
      COPY_LEVELS.slice(1).flatMap((_, i) => (copyLevel(p, i + 2) === level ? [`${i + 2}e exemplaire : ${p.name}`] : [])),
    ),
    ...ANIMALS.filter((a) => at(a.unlock)).map((a) => `Animal : ${a.name}`),
    ...RECIPES.filter((r) => at(r.unlock) && !PLACEABLES.some((p) => p.id === r.machine && at(p.unlock))).map((r) => `Recette : ${item(r.item).name}`),
    ...PLACEABLES.filter((p) => p.kind === 'deco' && !p.treasure && !p.retired && at(p.unlock)).map((p) => `Déco : ${p.name}`),
    ...SKINS.filter((s) => at(s.unlock)).map((s) => `Style de ${FAMILY_NAMES[s.family]} : ${s.name}`),
    ...PROJECTS.filter((p) => at(p.unlock)).map((p) => `Grand projet : ${p.name}`),
  ];
}

/** A new farm's empty booster stock. */
export function noBoosters(): FarmSave['boosters'] {
  return Object.fromEntries(BOOSTER_IDS.map((id) => [id, 0])) as FarmSave['boosters'];
}
