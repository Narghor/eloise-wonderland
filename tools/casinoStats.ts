// -----------------------------------------------
// CASINO STATS: simulates every slot machine the way its screen pays
// -----------------------------------------------
// node tools/casino-stats.mjs [spinsPerRun] [featuresPerMachine]
// Pools, growing jackpots and guaranteed minimums are played like on screen.

import { mulberry32 } from '../src/random';
import * as classic from '../src/games/casino/slots/slotsLogic';
import * as door from '../src/games/casino/bonus/bonusLogic';
import * as medusa from '../src/games/casino/olympus/olympusLogic';
import * as luna from '../src/games/casino/luna/lunaLogic';

const SPINS = Number(process.argv[2] ?? 2_000_000);
const FEATURES = Number(process.argv[3] ?? 200_000);
/** Optional comma list among classic, door, medusa, luna: only those machines. */
const ONLY = process.argv[4]?.split(',');
const wants = (machine: string) => !ONLY || ONLY.includes(machine);
const SEED_POOL = 5000;

// -----------------------------------------------
// MEASURES
// -----------------------------------------------

class Run {
  spins = 0;
  staked = 0;
  paid = 0;
  basePaid = 0;
  featurePaid = 0;
  jackpotPaid = 0;
  hits = 0;
  features = 0;
  sumSquares = 0;
  bestX = 0;
  constructor(readonly bet: number) {}
  spin(base: number, feature: number, jackpot: number): void {
    const total = base + feature + jackpot;
    this.spins++;
    this.staked += this.bet;
    this.paid += total;
    this.basePaid += base;
    this.featurePaid += feature;
    this.jackpotPaid += jackpot;
    if (total > 0) this.hits++;
    const x = total / this.bet;
    this.sumSquares += (x - 1) ** 2;
    this.bestX = Math.max(this.bestX, x);
  }
  report(label: string, extra = ''): string {
    const pct = (part: number) => `${((100 * part) / this.staked).toFixed(1)}`;
    return `${label.padEnd(26)} RTP ${pct(this.paid).padStart(5)} %  (jeu ${pct(this.basePaid)} + bonus ${pct(this.featurePaid)} + jackpot ${pct(this.jackpotPaid)})  gain 1 tour/${(this.spins / this.hits).toFixed(1)}  bonus 1/${this.features ? Math.round(this.spins / this.features) : '-'}  ecart-type ${Math.sqrt(this.sumSquares / this.spins).toFixed(1)}x  meilleur ${Math.round(this.bestX)}x${extra}`;
  }
}

/** Distribution of feature payouts, in multiples of the bet. */
function distribution(label: string, xs: number[], floorX: number): string {
  xs.sort((a, b) => a - b);
  const at = (q: number) => xs[Math.min(xs.length - 1, Math.floor(q * xs.length))];
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const atFloor = xs.filter((x) => x <= floorX + 1e-9).length / xs.length;
  const over = (limit: number) => `${((100 * xs.filter((x) => x >= limit).length) / xs.length).toFixed(1)} %`;
  return [
    `${label}  (${xs.length.toLocaleString('fr-FR')} bonus simules)`,
    `  moyenne ${mean.toFixed(1)}x   mediane ${at(0.5).toFixed(0)}x   au plancher (${floorX}x) ${(100 * atFloor).toFixed(1)} %`,
    `  10 % des bonus <= ${at(0.1).toFixed(0)}x   90 % <= ${at(0.9).toFixed(0)}x   99 % <= ${at(0.99).toFixed(0)}x   99,9 % <= ${at(0.999).toFixed(0)}x   max ${xs[xs.length - 1].toFixed(0)}x`,
    `  >= 50x : ${over(50)}   >= 100x : ${over(100)}   >= 250x : ${over(250)}   >= 500x : ${over(500)}   >= 1000x : ${over(1000)}`,
  ].join('\n');
}

const lines: string[] = [];
const out = (text = '') => {
  lines.push(text);
  console.log(text);
};

// -----------------------------------------------
// CLASSIC SLOTS
// -----------------------------------------------

function runClassic(bet: number): Run {
  const rng = mulberry32(1000 + bet);
  const run = new Run(bet);
  let pool = SEED_POOL;
  for (let i = 0; i < SPINS; i++) {
    pool += bet * classic.JACKPOT_SHARE;
    const result = classic.spin(bet, rng);
    if (result.jackpot) {
      const won = classic.jackpotFor(pool, bet);
      pool = SEED_POOL;
      run.features++;
      run.spin(0, 0, won);
    } else {
      run.spin(result.total, 0, 0);
    }
  }
  return run;
}

// -----------------------------------------------
// DOOR MACHINE
// -----------------------------------------------

function runDoor(level: door.BetLevel): { run: Run; grands: number; bonusXs: number[] } {
  const rng = mulberry32(2000 + level.bet);
  const run = new Run(level.bet);
  let grandPool = SEED_POOL;
  const growing = [0, 0, 0];
  let grands = 0;
  const bonusXs: number[] = [];
  for (let i = 0; i < SPINS; i++) {
    grandPool += level.bet * door.JACKPOT_FEED;
    for (let tier = 1; tier <= Math.min(2, level.jackpotTier); tier++) growing[tier] += level.bet * door.JACKPOT_GROWTH[tier];
    const grid = door.spinGrid(rng);
    const base = door.basePayout(door.lineWins(grid), level.bet);
    let feature = 0;
    let jackpot = 0;
    if (door.triggersBonus(grid)) {
      run.features++;
      const values = door.baseJackpots(level.bet).map((v, tier) => v + (door.JACKPOT_GROWTH[tier] > 0 ? Math.floor(growing[tier]) : 0));
      const bonus = door.playBonus(rng, level, undefined, values);
      feature = bonus.chips;
      bonusXs.push(bonus.chips / level.bet);
      const last = bonus.steps[bonus.steps.length - 1].cells;
      for (const coin of last) if (coin?.kind === 'jackpot' && door.JACKPOT_GROWTH[coin.tier] > 0) growing[coin.tier] = 0;
      if (bonus.grand) {
        grands++;
        jackpot = door.grandPrize(grandPool, level.bet);
        grandPool = SEED_POOL;
      }
    }
    run.spin(base, feature, jackpot);
  }
  return { run, grands, bonusXs };
}

// -----------------------------------------------
// MEDUSA
// -----------------------------------------------

function runMedusa(bet: number): Run {
  const rng = mulberry32(3000 + bet);
  const run = new Run(bet);
  for (let i = 0; i < SPINS; i++) {
    const grid = medusa.spinGrid(rng, false);
    const base = medusa.chipsFor(medusa.winMult(medusa.lineWins(grid)), bet);
    let feature = 0;
    const scatters = medusa.scatterCount(grid);
    if (scatters >= medusa.MIN_SCATTERS) {
      run.features++;
      feature = medusa.chipsFor(medusa.playFreeSpins(rng, medusa.freeSpinsFor(scatters)).mult, bet);
    }
    run.spin(base, feature, 0);
  }
  return run;
}

// -----------------------------------------------
// ELOISE'S BOOK
// -----------------------------------------------

function runLuna(bet: number): Run {
  const rng = mulberry32(4000 + bet);
  const run = new Run(bet);
  for (let i = 0; i < SPINS; i++) {
    const result = luna.baseSpin(rng);
    const base = luna.chipsFor(result.mult, bet);
    let feature = 0;
    if (result.books >= luna.MIN_BOOKS) {
      run.features++;
      feature = luna.chipsFor(luna.playFreeSpins(rng).mult, bet);
    }
    run.spin(base, feature, 0);
  }
  return run;
}

// -----------------------------------------------
// REPORT
// -----------------------------------------------

const started = Date.now();
out(`Simulation : ${SPINS.toLocaleString('fr-FR')} tours par ligne, ${FEATURES.toLocaleString('fr-FR')} bonus par distribution.`);
out('RTP = part des mises rendue a la longue. "jeu" = gains des rouleaux, "bonus" = tours gratuits / Hold & Spin, "jackpot" = cagnottes.');
out();

if (wants('classic')) {
  out('=== MACHINE A SOUS (classique) ===');
  for (const bet of [10, 100, 1000]) out(runClassic(bet).report(`mise ${bet}`, ' (bonus = jackpot diamants)'));
  out();
}

if (wants('door')) {
  out('=== MACHINE A PORTE ===');
  let doorXs: number[] = [];
  for (const level of door.BET_LEVELS) {
    const { run, grands, bonusXs } = runDoor(level);
    if (level.bet === 100) doorXs = bonusXs;
    out(run.report(`mise ${level.bet} (${door.JACKPOT_NAMES[level.jackpotTier]})`, `  Grand gagne ${grands} fois`));
  }
  const doorFeature: number[] = [];
  {
    const rng = mulberry32(2500);
    const level = door.BET_LEVELS[3];
    for (let i = 0; i < FEATURES; i++) doorFeature.push(door.playBonus(rng, level).chips / level.bet);
  }
  out(distribution('Bonus Hold & Spin, mise 100 (Mini + Minor)', doorFeature, door.BONUS_MIN_X));
  out(`  (sur la simulation de tours a mise 100 : ${doorXs.length} bonus)`);
  out();
}

if (wants('medusa')) {
  out('=== LE REGARD DE MEDUSA ===');
  for (const bet of [10, 100, 1000]) out(runMedusa(bet).report(`mise ${bet}`));
  {
    const rng = mulberry32(3500);
    for (const [scatters, label] of [[3, '3 temples = 10 tours'], [4, '4 temples = 25 tours'], [5, '5 temples = 100 tours']] as const) {
      const n = scatters === 3 ? FEATURES : Math.round(FEATURES / 4);
      const xs = Array.from({ length: n }, () => medusa.playFreeSpins(rng, medusa.freeSpinsFor(scatters)).mult);
      out(distribution(`Tours gratuits, ${label}`, xs, medusa.FREE_SPINS_MIN_X));
    }
  }
  out();
}

if (wants('luna')) {
  out("=== ELOISE'S BOOK ===");
  for (const bet of [10, 100, 1000]) out(runLuna(bet).report(`mise ${bet}`));
  {
    const rng = mulberry32(4500);
    out(distribution('Tours gratuits (10 tours, symbole special au hasard)', Array.from({ length: FEATURES }, () => luna.playFreeSpins(rng).mult), luna.FREE_SPINS_MIN_X));
  }
  out();
}

out(`(${Math.round((Date.now() - started) / 1000)} s)`);
