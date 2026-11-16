// REFERENCE ONLY (docs/ferme.md 18): the proposed lot 2 tables. Run it on a COPY of the game, never on the repo.
// Writes the proposed lot 2 into the scratch copy's data (never the repo).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const D = join(import.meta.dirname, 'src/games/farm/data/');
const edit = (f, pairs) => {
  let s = readFileSync(D + f, 'utf8');
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(f + ': ' + a.slice(0, 50));
    s = s.replace(a, b);
  }
  writeFileSync(D + f, s);
};
const L = (n) => `atLevel(${n})`;

// crops: [id, level, minutes, seed, xp]
const crops = [['beet', 8, 20, 4, 1], ['blueberry', 17, 90, 9, 2], ['lavender', 21, 360, 18, 3]];
const cottonLine = "  { id: 'cotton', unlock: atLevel(13), minutes: 480, seed: 20, yield: 2, xp: 4 },\n";
edit('crops.ts', [[cottonLine, cottonLine + crops.map(([id, l, m, s, x]) => `  { id: '${id}', unlock: ${L(l)}, minutes: ${m}, seed: ${s}, yield: 2, xp: ${x} },\n`).join('')]]);

// items: [id, value]
const items = [['beet', 6], ['blueberry', 15], ['lavender', 34],
  ['sheepFeed', 4], ['pigFeed', 5], ['beeFeed', 6], ['goatFeed', 6], ['duckFeed', 4], ['rabbitFeed', 9],
  ['wool', 30], ['truffle', 45], ['honey', 40], ['goatMilk', 24], ['feather', 30], ['angora', 55],
  ['sugar', 16], ['tomatoJuice', 32], ['carrotJuice', 21], ['strawberryJuice', 48], ['strawberryJam', 70], ['blueberryJam', 82],
  ['yarn', 78], ['honeyCandy', 73], ['lollipop', 72], ['nougat', 145], ['goatCheese', 98], ['blueberryPie', 122],
  ['scarf', 205], ['sweater', 450], ['cushion', 670], ['strawberryIce', 78], ['honeyIce', 110], ['blueberryIce', 86],
  ['lavenderSoap', 125], ['honeyCandle', 155], ['angoraYarn', 145], ['plushie', 950], ['crepe', 45], ['jamCrepe', 135],
  ['honeyCrepe', 98], ['pizza', 122], ['truffleGalette', 165], ['layerCake', 245], ['giftBasket', 420]];
const fabricLine = "  { id: 'fabric', name: 'Tissu', plural: 'Tissus', value: 420 },\n";
edit('items.ts', [[fabricLine, fabricLine + items.map(([id, v]) => `  { id: '${id}', name: '${id}', plural: '${id}', value: ${v} },\n`).join('')]]);

// animals: [id, pen, level, price, feed, minutes, product, xp, capacity, penName, penPrice]
const animals = [
  ['sheep', 'sheepfold', 8, 80, 'sheepFeed', 120, 'wool', 4, 5, 'Bergerie', 350],
  ['pig', 'pigsty', 10, 100, 'pigFeed', 180, 'truffle', 5, 5, 'Porcherie', 450],
  ['bee', 'hive', 12, 120, 'beeFeed', 180, 'honey', 5, 4, 'Rucher', 400],
  ['goat', 'goatShed', 16, 150, 'goatFeed', 90, 'goatMilk', 3, 5, 'Chevrerie', 600],
  ['duck', 'duckPond', 19, 170, 'duckFeed', 150, 'feather', 4, 6, 'Mare aux canards', 700],
  ['rabbit', 'hutch', 23, 220, 'rabbitFeed', 240, 'angora', 6, 6, 'Clapier', 850]];
const cowLine = "  { id: 'cow', name: 'Vache', plural: 'Vaches', pen: 'cowshed', unlock: atLevel(6), price: 60, feed: 'cowFeed', minutes: 60, product: 'milk', xp: 3 },\n";
edit('animals.ts', [
  [cowLine, cowLine + animals.map(([id, pen, l, p, f, m, pr, x]) => `  { id: '${id}', name: '${id}', plural: '${id}', pen: '${pen}', unlock: ${L(l)}, price: ${p}, feed: '${f}', minutes: ${m}, product: '${pr}', xp: ${x} },\n`).join('')],
  ['{ coop: 6, cowshed: 5 }', `{ coop: 6, cowshed: 5, ${animals.map((a) => `${a[1]}: ${a[8]}`).join(', ')} }`]]);

// machines and pens
const machines = [['sugar', 'Sucrerie', 9, 250], ['press', 'Pressoir', 10, 300], ['jam', 'Confiturerie', 11, 350], ['candy', 'Confiserie', 14, 450],
  ['sewing', 'Atelier de couture', 18, 600], ['iceCream', 'Glacier', 20, 700], ['soap', 'Savonnerie', 22, 800], ['crepe', 'Creperie', 25, 900]];
edit('placeables.ts', [
  ["machine('spinning', 'Filature', 14, 400),", "machine('spinning', 'Filature', 13, 400),\n"
    + machines.map(([id, n, l, p]) => `  machine('${id}', '${n}', ${l}, ${p}),\n`).join('')
    + animals.map((a) => `  pen('${a[1]}', '${a[9]}', ${a[2]}, ${a[10]}),\n`).join('')]]);

// recipes: [item, machine, level, minutes, inputs, count, xp]
const recipes = [
  ['sheepFeed', 'cookie', 8, 15, { corn: 2, beet: 3 }, 5, 1], ['pigFeed', 'cookie', 10, 20, { beet: 2, carrot: 3 }, 5, 1],
  ['beeFeed', 'cookie', 12, 20, { sunflower: 1, wheat: 3 }, 4, 1], ['goatFeed', 'cookie', 16, 20, { carrot: 3, tomato: 2 }, 5, 1],
  ['duckFeed', 'cookie', 19, 25, { wheat: 4, blueberry: 1 }, 6, 1], ['rabbitFeed', 'cookie', 23, 25, { carrot: 4, lavender: 1 }, 6, 1],
  ['sugar', 'sugar', 9, 20, { beet: 2 }, 1, 2],
  ['carrotJuice', 'press', 10, 20, { carrot: 4 }, 1, 2], ['tomatoJuice', 'press', 10, 30, { tomato: 3 }, 1, 3], ['strawberryJuice', 'press', 15, 45, { strawberry: 3 }, 1, 4],
  ['strawberryJam', 'jam', 11, 60, { strawberry: 3, sugar: 1 }, 1, 6], ['blueberryJam', 'jam', 17, 90, { blueberry: 3, sugar: 1 }, 1, 7],
  ['yarn', 'spinning', 13, 40, { wool: 2 }, 1, 5], ['angoraYarn', 'spinning', 24, 60, { angora: 2 }, 1, 9],
  ['honeyCandy', 'candy', 14, 40, { honey: 1, sugar: 1 }, 1, 6], ['lollipop', 'candy', 15, 30, { sugar: 2, strawberry: 2 }, 1, 5],
  ['nougat', 'candy', 24, 90, { honey: 2, sugar: 1, egg: 2 }, 1, 11], ['giftBasket', 'candy', 30, 240, { honeyCandy: 2, strawberryJam: 1, goatCheese: 1 }, 1, 22],
  ['goatCheese', 'dairy', 16, 120, { goatMilk: 3 }, 1, 8],
  ['blueberryPie', 'bakery', 17, 150, { flour: 1, blueberry: 3, egg: 1, butter: 1 }, 1, 10], ['pizza', 'bakery', 27, 90, { flour: 2, tomato: 3, cheese: 1 }, 1, 9],
  ['layerCake', 'bakery', 29, 300, { flour: 3, egg: 4, cream: 2, strawberryJam: 1, sugar: 2 }, 1, 17],
  ['scarf', 'sewing', 18, 90, { yarn: 2 }, 1, 12], ['cushion', 'sewing', 19, 180, { fabric: 1, feather: 3 }, 1, 20],
  ['sweater', 'sewing', 20, 180, { yarn: 3, thread: 1 }, 1, 18], ['plushie', 'sewing', 26, 240, { angoraYarn: 2, fabric: 1 }, 1, 28],
  ['strawberryIce', 'iceCream', 20, 45, { cream: 1, sugar: 1, strawberry: 2 }, 1, 6], ['honeyIce', 'iceCream', 21, 60, { cream: 1, honey: 1, goatMilk: 1 }, 1, 8],
  ['blueberryIce', 'iceCream', 22, 60, { cream: 1, sugar: 1, blueberry: 2 }, 1, 7],
  ['lavenderSoap', 'soap', 22, 90, { lavender: 2, goatMilk: 1 }, 1, 9], ['honeyCandle', 'soap', 24, 120, { honey: 2, lavender: 1 }, 1, 11],
  ['crepe', 'crepe', 25, 30, { flour: 2, egg: 2, milk: 1 }, 1, 4], ['jamCrepe', 'crepe', 26, 45, { flour: 2, egg: 2, milk: 1, strawberryJam: 1 }, 1, 9],
  ['honeyCrepe', 'crepe', 27, 45, { flour: 2, egg: 2, milk: 1, honey: 1 }, 1, 7], ['truffleGalette', 'crepe', 28, 60, { flour: 2, egg: 2, truffle: 1, cheese: 1 }, 1, 11]];
const obj = (o) => '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ') + ' }';
edit('machines.ts', [
  // A cookie batch feeds a whole pen.
  ["{ item: 'chickenFeed', machine: 'cookie', unlock: atLevel(2), minutes: 5, inputs: { wheat: 2, corn: 1 }, count: 3, xp: 1 }",
   "{ item: 'chickenFeed', machine: 'cookie', unlock: atLevel(2), minutes: 10, inputs: { wheat: 4, corn: 2 }, count: 6, xp: 1 }"],
  ["{ item: 'cowFeed', machine: 'cookie', unlock: atLevel(6), minutes: 10, inputs: { corn: 2, carrot: 1 }, count: 3, xp: 1 }",
   "{ item: 'cowFeed', machine: 'cookie', unlock: atLevel(6), minutes: 15, inputs: { corn: 3, carrot: 2 }, count: 5, xp: 1 }"],
  ["  { item: 'fabric',", recipes.map(([i, m, l, min, inp, c, x]) => `  { item: '${i}', machine: '${m}', unlock: ${L(l)}, minutes: ${min}, inputs: ${obj(inp)}, count: ${c}, xp: ${x} },\n`).join('') + "  { item: 'fabric',"],
  ["export const FEEDS: readonly ItemId[] = ['chickenFeed', 'cowFeed'];",
   "export const FEEDS: readonly ItemId[] = ['chickenFeed', 'cowFeed', 'sheepFeed', 'pigFeed', 'beeFeed', 'goatFeed', 'duckFeed', 'rabbitFeed'];"]]);
console.log('lot 2 written');
