import { BRIDGE_TILES, MAP_SIZE, isWater } from './data/land';
import { placeable } from './data/placeables';
import { gateTile, isOwned, isRoad, objectAt } from './farmMap';
import type { FarmSave } from './farmSave';

// -----------------------------------------------
// WALKING ON THE FARM: which tiles a villager can walk, and the way between two tiles (docs/ferme.md 22)
// -----------------------------------------------
// Four directions, tile to tile. Paths, the gate's yard and the bridge cost 1, grass costs GRASS_COST: a path is taken
// unless it is that many times longer. Anything standing on the ground blocks, except flat pieces and the gates (the
// garden gate, the round gate in the wall).

export type Tile = [number, number];

const GRASS_COST = 3;
/** The grid covers the map and the row under it, where the gate's yard is once the south edge is bought. */
const ROWS = MAP_SIZE + 1;

/** What a step onto this tile costs, or null when it cannot be walked. */
export function stepCost(save: FarmSave, x: number, y: number): number | null {
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= ROWS) return null;
  if (isRoad(save, x, y)) return y === gateTile(save)[1] ? 1 : null;
  if (!isOwned(save, x, y)) return null;
  if (isWater(x, y)) return isBridge(save, x, y) ? 1 : null;
  const there = objectAt(save, x, y);
  if (!there) return GRASS_COST;
  if (placeable(there.type).flat) return 1;
  return there.type === 'fenceGate' || there.type === 'moonGate' ? GRASS_COST : null;
}

export function isWalkable(save: FarmSave, x: number, y: number): boolean {
  return stepCost(save, x, y) !== null;
}

function isBridge(save: FarmSave, x: number, y: number): boolean {
  return save.projectsDone.includes('bridge') && BRIDGE_TILES.some(([bx, by]) => bx === x && by === y);
}

/** Every walkable tile reachable from `from`, with the cheapest way there (Dijkstra; the grid is 24 x 25). */
export class WalkMap {
  private readonly cost: Float64Array;
  private readonly prev: Int32Array;

  constructor(save: FarmSave, from: Tile) {
    const size = MAP_SIZE * ROWS;
    this.cost = new Float64Array(size).fill(Infinity);
    this.prev = new Int32Array(size).fill(-1);
    if (!isWalkable(save, from[0], from[1])) return;
    const start = index(from);
    this.cost[start] = 0;
    const open = [start];
    const done = new Uint8Array(size);
    while (open.length > 0) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (this.cost[open[i]] < this.cost[open[best]]) best = i;
      const current = open[best];
      open[best] = open[open.length - 1];
      open.pop();
      if (done[current]) continue;
      done[current] = 1;
      const cx = current % MAP_SIZE;
      const cy = Math.floor(current / MAP_SIZE);
      for (const [dx, dy] of STEPS) {
        const step = stepCost(save, cx + dx, cy + dy);
        if (step === null) continue;
        const next = index([cx + dx, cy + dy]);
        const total = this.cost[current] + step;
        if (total < this.cost[next]) {
          this.cost[next] = total;
          this.prev[next] = current;
          open.push(next);
        }
      }
    }
  }

  canReach(to: Tile): boolean {
    return this.costTo(to) < Infinity;
  }

  /** What the cheapest way to `to` costs (Infinity when there is none). */
  costTo(to: Tile): number {
    return inGrid(to) ? this.cost[index(to)] : Infinity;
  }

  /** The tiles from the start to `to`, both included; empty when `to` cannot be reached. */
  routeTo(to: Tile): Tile[] {
    if (!this.canReach(to)) return [];
    const tiles: Tile[] = [];
    for (let i = index(to); i !== -1; i = this.prev[i]) tiles.push([i % MAP_SIZE, Math.floor(i / MAP_SIZE)]);
    return tiles.reverse();
  }
}

const STEPS: readonly Tile[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function inGrid([x, y]: Tile): boolean {
  return x >= 0 && x < MAP_SIZE && y >= 0 && y < ROWS;
}

function index([x, y]: Tile): number {
  return y * MAP_SIZE + x;
}
