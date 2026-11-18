// Runs in the page: draws the building-skin board, returns a PNG data URL.
(async () => {
  const A = await import('/src/games/farm/farmArt.ts');
  const Pt = await import('/src/games/farm/farmPaint.ts');
  const C = Pt.C;
  const ROOFS = Pt.ROOF_TONES;
  const WOOD = [C.woodLight, C.wood, C.woodDark];
  const STONE = [...Pt.WARM_STONE];
  const GREY = [C.greyLight, C.grey, C.greyDark];
  const roofSet = new Set(ROOFS.flat());
  const THEMES = [
    { name: "D'origine" },
    { name: 'Chaumière', roof: ['#f5e7bf', '#e2c77e', '#c3a256', '#9a7c3c'], wood: ['#e6c08c', '#c99a62', '#a3743f'] },
    { name: 'Chalet', roof: ['#a08b8b', '#7a6666', '#5e4d4d', '#463939'], wood: ['#9a6644', '#7a4c31', '#5e3824'], stone: GREY },
    { name: 'Provence', roof: ['#ffc1a1', '#f29a72', '#d27552', '#ad5a3d'], wood: ['#c9d8f0', '#9db6de', '#7a95c4'] },
    { name: 'Bord de mer', roof: ['#d8ecfb', '#9cc8ef', '#78a8d6', '#5a88b8'], wood: ['#fffaf2', '#ece6da', '#cfc6b6'], stone: ['#f4efe6', '#e0d6c6', '#c2b5a1'] },
    { name: 'Forêt', roof: ['#c2e08a', '#86b350', '#64903a', '#4a6d2b'], wood: ['#b5835b', '#8f5e3e', '#6f4630'] },
    { name: 'Cerisier', rare: 'Rare', roof: ['#ffe0ea', '#fbc4d2', '#ec94ac', '#cc6e8a'], wood: ['#f2d6c4', '#d9b39b', '#b88d74'], overlay: 'petals' },
    { name: "Pain d'épices", rare: 'Épique', roof: ['#fffaf2', '#f6efe4', '#e6dccd', '#cfc3b1'], wood: ['#d9935a', '#b8703c', '#94552a'], stone: ['#d9935a', '#b8703c', '#94552a'], overlay: 'icing' },
    { name: 'Hiver', rare: 'Épique', overlay: 'snow' },
    { name: 'Doré', rare: 'Légendaire', roof: ['#fff1b0', '#f2c94c', '#d9a339', '#b07d22'], wood: ['#fbe38a', '#e8b54a', '#c48f2c'], overlay: 'sparkle' },
  ];
  const hex = (r, g, b) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function reskin(src, th) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height);
    const d = im.data, W = c.width, H = c.height;
    const map = {};
    if (th.roof) for (const R of ROOFS) R.forEach((col, i) => (map[col] = th.roof[i]));
    if (th.wood) WOOD.forEach((col, i) => (map[col] = th.wood[i]));
    if (th.stone) STONE.forEach((col, i) => (map[col] = th.stone[i]));
    const isRoof = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      if (d[i + 3] < 255) continue;
      const h = hex(d[i], d[i + 1], d[i + 2]);
      if (roofSet.has(h)) isRoof[p] = 1;
      const to = map[h];
      if (to) { const [r, gg, b] = rgb(to); d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
    }
    const put = (x, y, col) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      if (d[i + 3] < 255) return;
      const [r, gg, b] = rgb(col); d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    };
    const opaque = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] === 255;
    const roofTop = (x) => { for (let y = 0; y < H; y++) if (isRoof[y * W + x]) return y; return -1; };
    const roofBottom = (x) => { let last = -1; for (let y = 0; y < H; y++) if (isRoof[y * W + x]) last = y; return last; };
    if (th.overlay === 'snow') for (let x = 0; x < W; x++) {
      const t = roofTop(x); if (t < 0) continue;
      put(x, t, '#ffffff'); put(x, t + 1, '#ffffff'); if ((x * 7) % 5 < 3) put(x, t + 2, '#e6f0fa');
      const b = roofBottom(x);
      if (b > t + 3 && x % 3 === 1) put(x, b, '#ffffff');
      if (b > t + 3 && x % 4 === 2 && opaque(x, b + 1)) put(x, b + 1, '#cfe6f7');
    }
    if (th.overlay === 'icing') for (let x = 0; x < W; x++) {
      const b = roofBottom(x); if (b < 0) continue;
      const drip = [0, 1, 2, 1, 0, 0, 1, 0][x % 8];
      for (let k = 0; k <= drip; k++) put(x, b + 1 + k, '#fffaf2');
      const t = roofTop(x);
      if (t >= 0 && x % 4 === 1) put(x, t + 3, ['#e0475b', '#5aa54a', '#5c9fd6'][(x >> 2) % 3]);
    }
    let s = 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    if (th.overlay === 'petals') for (let p = 0; p < W * H; p++) if (isRoof[p] && rnd() < 0.09) put(p % W, (p / W) | 0, rnd() < 0.5 ? '#ffffff' : '#f06a96');
    if (th.overlay === 'sparkle') for (let p = 0; p < W * H; p++) if (isRoof[p] && rnd() < 0.04) put(p % W, (p / W) | 0, '#fff6c8');
    g.putImageData(im, 0, 0);
    return c;
  }
  const ALL = ['cookiery', 'mill', 'bakery', 'dairy', 'refinery', 'press', 'jamKitchen', 'spinning', 'candyShop', 'sewing', 'iceCream', 'soapWorks', 'creperie', 'coop', 'cowshed', 'sheepfold', 'pigsty', 'hive', 'goatShed', 'duckPond', 'hutch'];
  const IDS = (window.BOARD_IDS || ALL).map((id) => [id, id]);
  if (window.BOARD_THEMES) THEMES.splice(0, THEMES.length, ...THEMES.filter((t) => window.BOARD_THEMES.includes(t.name)));
  const VIEW = window.BOARD_VIEW || 'face';
  const sprites = IDS.map(([id]) => A.objectSprite(id, VIEW));
  const S = window.BOARD_SCALE || 3, LW = 150;
  const CW = Math.max(...sprites.map((s) => s.width)) * S + 12;
  const RH = Math.max(...sprites.map((s) => s.height)) * S + 12;
  const out = document.createElement('canvas');
  out.width = LW + IDS.length * CW;
  out.height = 40 + THEMES.length * RH;
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#9ccc6a'; g.fillRect(0, 0, out.width, out.height);
  g.font = 'bold 12px sans-serif'; g.fillStyle = '#4a3135';
  IDS.forEach(([, n], k) => g.fillText(n, LW + k * CW + 10, 28));
  THEMES.forEach((th, r) => {
    const y0 = 40 + r * RH;
    g.fillStyle = th.rare ? (r % 2 ? '#c9b6e0' : '#d6c6ea') : (r % 2 ? '#93c462' : '#a2d273');
    g.fillRect(0, y0, out.width, RH);
    g.fillStyle = '#4a3135'; g.font = 'bold 18px sans-serif'; g.fillText(th.name, 10, y0 + RH / 2);
    if (th.rare) { g.font = '14px sans-serif'; g.fillText('colis · ' + th.rare, 10, y0 + RH / 2 + 22); }
    sprites.forEach((sp, k) => {
      const s = reskin(sp, th);
      g.drawImage(s, LW + k * CW + (CW - s.width * S) / 2, y0 + RH - 6 - s.height * S, s.width * S, s.height * S);
    });
  });
  return out.toDataURL('image/png');
})()
