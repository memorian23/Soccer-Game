// 불사조 길들이기 — 육성 · 진화 · 합성 · 부화 · AI 전투
(() => {
'use strict';

// ============================================================
// utilities
// ============================================================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, f) => a + (b - a) * f;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');

// ============================================================
// assets (cut out of the original artwork)
// ============================================================
const A = window.PHOENIX_ASSETS;
const STAGE_KEYS = ['chick', 'young', 'adult'];
const STAGE_NAMES = ['새끼', '청년', '어른'];
const FACING = [0, 1, -1]; // chick faces front, young faces right, adult faces left
const HEAD = [[190, 300], [500, 245], [742, 160]]; // head positions in the 1024x559 artwork
const LABEL_POS = [[180, 495], [490, 493], [793, 470]];
const IMG_W = 1024, IMG_H = 559;
const IM = {};
let SRC = [], THUMB = [];

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function toCanvas(img, s) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// ============================================================
// 200 colours: 20 hues x 10 tones, 10 of them replaced by mythic phoenixes
// ============================================================
const HUE_NAMES = ['진홍', '주홍', '호박', '황금', '레몬', '연두', '풀잎', '비취', '에메랄드', '옥빛',
  '청록', '하늘', '창공', '사파이어', '남색', '보라', '자수정', '자홍', '장미', '루비'];
const TONES = [
  { p: '', s: 1, b: 1, r: 0 },
  { p: '빛나는 ', s: 0.9, b: 1.22, r: 1 },
  { p: '그림자 ', s: 1.15, b: 0.7, r: 1 },
  { p: '파스텔 ', s: 0.45, b: 1.15, r: 2 },
  { p: '네온 ', s: 1.65, b: 1.08, r: 3 },
  { p: '얼음 ', s: 0.6, b: 1.1, r: 1, fx: 'frost' },
  { p: '용암 ', s: 1.35, b: 1.05, r: 2, fx: 'lava' },
  { p: '쌍색 ', s: 1.15, b: 1.02, r: 2, fx: 'dual' },
  { p: '유령 ', s: 0.55, b: 1.15, r: 3, fx: 'ghost' },
  { p: '황금테 ', s: 1.1, b: 0.95, r: 3, fx: 'gild' },
];
const MYTHIC = {
  80: ['흑염', 'black'], 84: ['백염', 'white'], 88: ['무지개', 'rainbow'], 92: ['은하', 'galaxy'], 96: ['황혼', 'dusk'],
  180: ['태초', 'primal'], 184: ['심연', 'abyss'], 188: ['오로라', 'aurora'], 192: ['성운', 'nebula'], 196: ['불멸', 'immortal'],
};
const RARITY = ['일반', '희귀', '영웅', '전설', '신화', '신'];
const RARITY_COL = ['#bdbdbd', '#5ab0ff', '#c77dff', '#ffb347', '#ff5a7a', '#fff1a0'];
const ELEM = {
  fire: { n: '화', i: '🔥' }, wind: { n: '풍', i: '🍃' }, water: { n: '수', i: '💧' }, spirit: { n: '영', i: '🔮' }, holy: { n: '신성', i: '✨' }, divine: { n: '신', i: '👑' },
};
const BASE_HUE = 33; // average hue of the original flames
const STARTER_COLOR = 2; // 호박 — practically the original artwork colours

function hueElem(h) {
  if (h <= 54 || h >= 342) return 'fire';
  if (h <= 162) return 'wind';
  if (h <= 252) return 'water';
  return 'spirit';
}

function mHue(deg) {
  const r = (deg * Math.PI) / 180, a = Math.cos(r), b = Math.sin(r);
  return [0.213 + 0.787 * a - 0.213 * b, 0.715 - 0.715 * a - 0.715 * b, 0.072 - 0.072 * a + 0.928 * b,
    0.213 - 0.213 * a + 0.143 * b, 0.715 + 0.285 * a + 0.140 * b, 0.072 - 0.072 * a - 0.283 * b,
    0.213 - 0.213 * a - 0.787 * b, 0.715 - 0.715 * a + 0.715 * b, 0.072 + 0.928 * a + 0.072 * b];
}
function mSat(s) {
  return [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
}
function mMul(A2, B2) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A2[i * 3] * B2[j] + A2[i * 3 + 1] * B2[3 + j] + A2[i * 3 + 2] * B2[6 + j];
  return C;
}
const mFor = (hue, sat, bri) => mMul(mSat(sat), mHue(hue - BASE_HUE)).map((v) => v * bri);
function applyM(M, r, g, b) {
  return [clamp(M[0] * r + M[1] * g + M[2] * b, 0, 255), clamp(M[3] * r + M[4] * g + M[5] * b, 0, 255), clamp(M[6] * r + M[7] * g + M[8] * b, 0, 255)];
}

const MYTHIC_POST = { abyss: 'abyss', immortal: 'gild', aurora: 'aurora' };
const STARS = { galaxy: [255, 255, 255], black: [255, 90, 40], nebula: [255, 240, 255], abyss: [120, 255, 255], frost: [235, 250, 255] };
const COLORS = [];
for (let t = 0; t < TONES.length; t++) {
  for (let h = 0; h < 20; h++) {
    const id = t * 20 + h, hue = h * 18;
    if (MYTHIC[id]) {
      const kind = MYTHIC[id][1];
      COLORS.push({ id, name: MYTHIC[id][0] + ' 불사조', short: MYTHIC[id][0], rar: 4, elem: 'holy', kind, post: MYTHIC_POST[kind] || null, stars: STARS[kind] || null, hIdx: -1 });
    } else {
      const T0 = TONES[t];
      COLORS.push({ id, name: T0.p + HUE_NAMES[h] + ' 불사조', short: T0.p + HUE_NAMES[h], rar: T0.r, elem: hueElem(hue), kind: T0.fx === 'dual' ? 'dual' : 'mat',
        post: T0.fx && T0.fx !== 'dual' ? T0.fx : null, stars: T0.fx === 'frost' ? STARS.frost : null, hue, s: T0.s, b: T0.b, hIdx: h, tone: t });
    }
  }
}
// 신(god) grade — 10 phoenixes above mythic
const GODS = [
  ['천제', { mat: () => mFor(BASE_HUE, 0.2, 1.3), post: 'gild', stars: [255, 230, 120] }],
  ['태양신', { mat: () => mFor(42, 1.8, 1.18), post: 'gild', stars: [255, 255, 200] }],
  ['월신', { mat: () => mFor(215, 0.35, 1.25), post: 'frost', stars: [255, 255, 255] }],
  ['뇌신', { mat: (fx, fy) => mFor(55 + fy * 150, 1.6, 1.15), perRow: true, stars: [200, 255, 255] }],
  ['해신', { mat: (fx, fy) => mFor(170 + fy * 60, 1.4, 1.0), perRow: true, post: 'frost' }],
  ['명계신', { mat: () => mFor(280, 1.4, 0.95), post: 'lava', stars: [200, 120, 255] }],
  ['시간신', { mat: () => mFor(42, 0.55, 1.15), post: 'ghost', stars: [255, 240, 180] }],
  ['창세신', { mat: (fx) => mFor(fx * 360, 1.5, 1.1), perCol: true, post: 'gild' }],
  ['혼돈신', { mat: (fx, fy) => mFor(fy * 300, 1.3, 1.0), perRow: true, post: 'invert' }],
  ['영원신', { mat: () => mFor(BASE_HUE, 0.05, 1.3), post: 'prism' }],
];
for (const [nm, o] of GODS) {
  COLORS.push({ id: COLORS.length, name: nm + ' 불사조', short: nm, rar: 5, elem: 'divine', kind: 'god', matFn: o.mat, perCol: !!o.perCol, perRow: !!o.perRow, post: o.post || null, stars: o.stars || null, hIdx: -1 });
}
function hueRGB(h) {
  h = ((h % 360) + 360) % 360 / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  const t = [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][Math.floor(h) % 6];
  return t.map((v) => v * 255);
}
const PER_COL = new Set(['rainbow', 'aurora']);
const PER_ROW = new Set(['galaxy', 'dusk', 'primal', 'nebula', 'dual']);
function colorMatrix(C, fx, fy) {
  if (C.matFn) return C.matFn(fx, fy);
  switch (C.kind) {
    case 'black': return mFor(BASE_HUE, 0.25, 0.42);
    case 'white': return mFor(BASE_HUE, 0.08, 1.32);
    case 'rainbow': return mFor(fx * 360, 1.35, 1.05);
    case 'galaxy': return mFor(235 + fy * 50, 1.25, 0.72);
    case 'dusk': return mFor(285 + fy * 105, 1.25, 1.0);
    case 'primal': return mFor(fy * 55, 1.55, 1.05);
    case 'abyss': return mFor(225, 1.2, 0.75);
    case 'aurora': return mFor(110 + fx * 190, 1.35, 1.12);
    case 'nebula': return mFor(310 - fy * 130, 1.3, 0.85);
    case 'immortal': return mFor(BASE_HUE, 0.12, 1.22);
    case 'dual': return mFor(C.hue + fy * 170, C.s, C.b);
    default: return mFor(C.hue, C.s, C.b);
  }
}
for (const C of COLORS) {
  const [r, g, b] = applyM(colorMatrix(C, 0.5, 0.5), 255, 150, 50);
  C.glow = C.kind === 'abyss' ? '120,240,255' : C.kind === 'immortal' ? '255,220,130' : C.post === 'invert' || C.post === 'prism' ? '255,236,160' : `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
}

function colorize(src, C) {
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, w, h), p = d.data;
  const perCol = C.perCol || PER_COL.has(C.kind), perRow = C.perRow || PER_ROW.has(C.kind);
  const fixed = !perCol && !perRow ? colorMatrix(C, 0.5, 0.5) : null;
  const cols = perCol ? Array.from({ length: w }, (_, x) => colorMatrix(C, x / w, 0.5)) : null;
  const post = C.post;
  for (let y = 0; y < h; y++) {
    const rowM = perRow ? colorMatrix(C, 0.5, y / h) : null;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (p[i + 3] === 0) continue;
      const M = fixed || rowM || cols[x];
      const r = p[i], gg = p[i + 1], b = p[i + 2];
      let r2 = M[0] * r + M[1] * gg + M[2] * b;
      let g2 = M[3] * r + M[4] * gg + M[5] * b;
      let b2 = M[6] * r + M[7] * gg + M[8] * b;
      if (post) {
        const l = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
        if (post === 'frost') {
          const k = 0.45 * l;
          r2 = lerp(r2, 215, k); g2 = lerp(g2, 240, k); b2 = lerp(b2, 255, k);
        } else if (post === 'lava' || post === 'abyss') {
          const f = 0.22 + 1.55 * Math.pow(l, 2.3);
          r2 *= f; g2 *= f; b2 *= f;
          if (post === 'abyss' && l > 0.65) { const k = Math.min(1, (l - 0.65) / 0.3); r2 = lerp(r2, 110, k); g2 = lerp(g2, 250, k); b2 = lerp(b2, 255, k); }
        } else if (post === 'ghost') {
          p[i + 3] *= 0.45 + 0.4 * l;
          r2 = lerp(r2, 230, 0.15); g2 = lerp(g2, 240, 0.15); b2 = lerp(b2, 255, 0.15);
        } else if (post === 'aurora') {
          p[i + 3] *= 0.88;
        } else if (post === 'invert') {
          r2 = 255 - r2 * 0.85; g2 = 255 - g2 * 0.85; b2 = 255 - b2 * 0.85;
        } else if (post === 'prism') {
          if (l > 0.42) { const k = Math.min(1, (l - 0.42) / 0.4) * 0.8, hc = hueRGB((x / w + y / h) * 360); r2 = lerp(r2, hc[0], k); g2 = lerp(g2, hc[1], k); b2 = lerp(b2, hc[2], k); }
        } else if (post === 'gild') {
          if (l > 0.5) { const k = Math.min(1, (l - 0.5) / 0.4) * 0.85; r2 = lerp(r2, 255, k); g2 = lerp(g2, 212, k); b2 = lerp(b2, 90, k); }
        }
      }
      p[i] = r2; p[i + 1] = g2; p[i + 2] = b2;
    }
  }
  if (C.stars) {
    const R = rng(C.id + w);
    const n = Math.floor((w * h) / (C.kind === 'galaxy' || C.kind === 'nebula' ? 260 : 700));
    for (let k = 0; k < n; k++) {
      const x = Math.floor(R() * w), y = Math.floor(R() * h), i = (y * w + x) * 4;
      if (p[i + 3] < 200) continue;
      p[i] = C.stars[0]; p[i + 1] = C.stars[1]; p[i + 2] = C.stars[2];
    }
  }
  g.putImageData(d, 0, 0);
  // copy into a GPU-friendly canvas (willReadFrequently keeps canvases on the CPU)
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').drawImage(c, 0, 0);
  return out;
}
const NCOL = COLORS.length;
const CCACHE = new Map();
function colored(cid, st, thumb) {
  const key = cid + '|' + st + '|' + (thumb ? 't' : 'f');
  let c = CCACHE.get(key);
  if (!c) { c = colorize(thumb ? THUMB[st] : SRC[st], COLORS[cid]); CCACHE.set(key, c); }
  return c;
}
const UCACHE = new Map();
function thumbURL(cid, st) {
  const key = cid + '|' + st;
  let u = UCACHE.get(key);
  if (!u) { u = colored(cid, st, true).toDataURL('image/png'); UCACHE.set(key, u); }
  return u;
}
const bigURL = (cid, st) => colored(cid, st, false).toDataURL('image/png');

// ============================================================
// phoenix model
// ============================================================
const LV_CAP = [50, 60, 70]; // 새끼·청년·어른 level caps (eggs hatch at Lv.40+)
const HATCH_LV = [40, 45]; // hatched phoenixes start between these levels
const hatchLevel = () => HATCH_LV[0] + Math.floor(Math.random() * (HATCH_LV[1] - HATCH_LV[0] + 1));
const EVO = [{ cost: 50 }, { cost: 150 }]; // evolution needs only 불씨
const RAR_MUL = [1, 1.15, 1.32, 1.55, 1.85, 2.3];
const STAGE_MUL = [1, 1.55, 2.2];
const expNeed = (lv) => 20 + lv * lv * 3;

function variance(cid) {
  return { atk: 0.9 + ((cid * 37) % 21) / 100, def: 0.9 + ((cid * 53) % 21) / 100, spd: 0.9 + ((cid * 71) % 21) / 100 };
}
function statsOf(p) {
  const C = COLORS[p.c], v = variance(p.c);
  const k = RAR_MUL[C.rar] * (1 + 0.09 * (p.lv - 1)) * STAGE_MUL[p.st] * (1 + 0.12 * p.star) * (1 + 0.15 * p.bond / 100);
  const hp = Math.round(120 * k);
  const atk = Math.round(22 * k * v.atk);
  const def = Math.round(10 * k * v.def);
  const spd = Math.round(10 * (1 + 0.012 * (p.lv - 1)) * (1 + C.rar * 0.05) * (1 + p.st * 0.08) * v.spd * 10) / 10;
  return { hp, atk, def, spd, power: Math.round(hp / 4 + atk * 2 + def * 2 + spd * 3) };
}
const nameOf = (p) => p.nick || COLORS[p.c].name;
const stars = (n) => (n ? '<span class="stars">' + '★'.repeat(n) + '</span>' : '');

// ============================================================
// save state
// ============================================================
const SAVE_KEY = 'phoenix-taming-v2';
let G = null;
function newGame() {
  G = { v: 2, coins: 300, ph: [], rep: 0, nextUid: 1, stage: 1, best: 1, dex: Array(NCOL).fill(0), speed: 1, tactic: 'adv', autoNext: false, muted: false, created: Date.now() };
  const p = addPhoenix({ c: STARTER_COLOR, st: 0, lv: 1 });
  p.party = true;
  G.rep = p.uid;
}
function addPhoenix(o) {
  const p = { uid: G.nextUid++, c: o.c, st: o.st || 0, lv: o.lv || 1, xp: 0, star: o.star || 0, bond: o.bond || 0, party: !!o.party, nick: o.nick || '' };
  G.ph.push(p);
  G.dex[p.c] = 1;
  return p;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* storage unavailable */ } }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.ph) && s.ph.length) return s;
  } catch (e) { /* ignore */ }
  return null;
}
const byUid = (uid) => G.ph.find((p) => p.uid === uid);
function rep() {
  let p = byUid(G.rep);
  if (!p && G.ph.length) { p = G.ph[0]; G.rep = p.uid; }
  return p;
}
const party = () => G.ph.filter((p) => p.party);
const PARTY_MAX = 5;
// put p in (or out of) the battle party; refuses when the party is already full
function setParty(p, on) {
  if (on && !p.party && party().length >= PARTY_MAX) { toast(`출전은 최대 ${PARTY_MAX}마리까지예요. 다른 불사조를 먼저 빼 주세요`); return false; }
  p.party = on;
  return true;
}
// strongest possible team: top PARTY_MAX by power
function bestParty() {
  const top = G.ph.slice().sort(SORTS.power).slice(0, PARTY_MAX);
  for (const p of G.ph) p.party = false;
  for (const p of top) p.party = true;
  return top;
}
// keep old saves (or merges) within the limit by keeping the strongest
function trimParty() {
  const pt = party();
  if (pt.length <= PARTY_MAX) return;
  pt.sort(SORTS.power).slice(PARTY_MAX).forEach((p) => (p.party = false));
}
function bestPartyAction(after) {
  const top = bestParty();
  save();
  SFX.good();
  toast(`💪 가장 센 편성: ${top.length}마리 · 전투력 ${fmt(top.reduce((a, p) => a + statsOf(p).power, 0))}`, 2.5);
  after();
  updateTop();
}

function addExp(p, n) {
  let ups = 0;
  p.xp += n;
  while (p.lv < LV_CAP[p.st] && p.xp >= expNeed(p.lv)) { p.xp -= expNeed(p.lv); p.lv++; ups++; }
  if (p.lv >= LV_CAP[p.st]) p.xp = Math.min(p.xp, expNeed(p.lv));
  return ups;
}
const canEvolve = (p) => p.st < 2;

// ============================================================
// canvas
// ============================================================
const cv = $('c');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, S = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  S = Math.min(W / 900, H / 600);
  if (B) layoutBattle();
}

// ============================================================
// audio
// ============================================================
let AC = null;
function tone(freq, dur, type = 'sine', vol = 0.1, slide = 0, delay = 0) {
  if (!G || G.muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime + delay;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(AC.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* audio unavailable */ }
}
const SFX = {
  chirp(st = 0) { const b = [1500, 900, 600][st]; tone(b, 0.09, 'triangle', 0.08, b * 0.5); tone(b * 1.2, 0.12, 'triangle', 0.08, b * 0.4, 0.1); },
  eat() { tone(300, 0.08, 'square', 0.05, -100); tone(380, 0.08, 'square', 0.05, -100, 0.1); },
  hiss() { tone(220, 0.35, 'sawtooth', 0.06, -150); },
  good() { tone(660, 0.1, 'triangle', 0.08); tone(880, 0.14, 'triangle', 0.08, 0, 0.08); },
  perfect() { tone(880, 0.1, 'triangle', 0.09); tone(1175, 0.1, 'triangle', 0.09, 0, 0.08); tone(1760, 0.18, 'triangle', 0.08, 0, 0.16); },
  miss() { tone(200, 0.2, 'square', 0.05, -80); },
  pick() { tone(990, 0.06, 'sine', 0.08, 400); },
  splash() { tone(400, 0.25, 'sine', 0.08, -300); },
  hit() { tone(180 + Math.random() * 60, 0.07, 'square', 0.03, -60); },
  fire() { tone(500, 0.12, 'sawtooth', 0.025, -300); },
  breath() { tone(260, 0.35, 'sawtooth', 0.03, -180); tone(140, 0.4, 'square', 0.015, -60); },
  heal() { tone(700, 0.2, 'sine', 0.05, 300); },
  evolve() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, 0, i * 0.14)); },
  win() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, 0, i * 0.12)); },
  lose() { [440, 370, 311, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0, i * 0.15)); },
  storm() { tone(120, 0.8, 'sawtooth', 0.08, 400); tone(80, 0.9, 'square', 0.04, 200, 0.1); },
};

// ============================================================
// particles
// ============================================================
let parts = [];
function emit(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.angle !== undefined ? o.angle + rand(-o.spread, o.spread) : rand(0, Math.PI * 2);
    const sp = rand(o.smin || 20, o.smax || 120) * S;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(o.lmin || 0.5, o.lmax || 1.2),
      size: rand(o.rmin || 1.5, o.rmax || 4) * S, kind: o.kind || 'ember', color: o.color, rise: o.rise ?? 60 });
  }
}
function floatText(x, y, text, color = '#ffe08a', size = 18) {
  parts.push({ x, y, vx: 0, vy: -55 * S, life: 0, max: 1.1, size: size * Math.max(0.75, S), kind: 'text', text, color, rise: 0 });
}
function updateParts(dt) {
  for (const p of parts) {
    p.life += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy -= p.rise * S * dt;
    p.vx *= 1 - 1.2 * dt;
  }
  if (parts.length > 1400) parts.splice(0, parts.length - 1400);
  parts = parts.filter((p) => p.life < p.max);
}
function drawParts() {
  for (const p of parts) {
    const f = 1 - p.life / p.max;
    if (p.kind === 'text') {
      ctx.globalAlpha = Math.min(1, f * 2.5);
      ctx.font = `800 ${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.kind === 'heart') {
      ctx.globalAlpha = f;
      ctx.fillStyle = '#ff6a9a';
      const s = p.size * 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + s * 0.3);
      ctx.bezierCurveTo(p.x - s, p.y - s * 0.4, p.x - s * 0.5, p.y - s, p.x, p.y - s * 0.45);
      ctx.bezierCurveTo(p.x + s * 0.5, p.y - s, p.x + s, p.y - s * 0.4, p.x, p.y + s * 0.3);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = f;
      ctx.fillStyle = p.color ? `rgb(${p.color})` : (f > 0.6 ? '#fff3b0' : f > 0.3 ? '#ffb03a' : '#ff5a10');
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + f * 0.6), 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.globalAlpha = 1;
}
let ambient = [];
function updateAmbient(dt) {
  if (ambient.length < 80 && Math.random() < dt * 30) ambient.push({ x: rand(0, W), y: H + 5, vy: -rand(20, 70) * S, s: rand(0.8, 2.4) * S, ph: rand(0, 6), life: 0, max: rand(4, 9) });
  for (const a of ambient) { a.life += dt; a.y += a.vy * dt; a.x += Math.sin(a.life * 1.5 + a.ph) * 15 * S * dt; }
  ambient = ambient.filter((a) => a.life < a.max && a.y > -10);
}
function drawAmbient() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const a of ambient) {
    ctx.globalAlpha = Math.min(1, (1 - a.life / a.max) * 1.5) * 0.8;
    ctx.fillStyle = '#ff9a3a';
    ctx.beginPath(); ctx.arc(a.x, a.y, a.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawHalo(x, y, r, a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(255,236,150,0.85)';
  ctx.lineWidth = Math.max(1.5, r * 0.025);
  ctx.shadowColor = '#ffe680'; ctx.shadowBlur = 12;
  ctx.rotate(T * 0.6);
  ctx.setLineDash([r * 0.18, r * 0.09]);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(-T * 1.4);
  ctx.setLineDash([r * 0.05, r * 0.12]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 6; i++) {
    const an = T * 0.8 + (i / 6) * Math.PI * 2;
    ctx.fillStyle = 'rgba(255,245,200,0.9)';
    ctx.beginPath(); ctx.arc(Math.cos(an) * r, Math.sin(an) * r, Math.max(1.5, r * 0.03), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
const GLOWS = new Map();
function glowSprite(rgb) {
  let c = GLOWS.get(rgb);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    GLOWS.set(rgb, c);
  }
  return c;
}
function glow(x, y, r, rgb, a) {
  const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = prevOp;
  ctx.globalAlpha = prevA;
}

// ============================================================
// UI helpers
// ============================================================
let toastT = 0;
function toast(msg, d = 2) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); toastT = d; }
let modalOpen = false;
function showModal(title, html, buttons, opts = {}) {
  modalOpen = true;
  $('mTitle').textContent = title;
  $('mBody').innerHTML = html;
  const box = $('mBtns');
  box.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.textContent = b.label;
    if (b.primary) el.className = 'primary';
    if (b.disabled) el.disabled = true;
    el.onclick = () => { if (!b.keep) closeModal(); b.fn && b.fn(); };
    box.appendChild(el);
  }
  $('modal').classList.remove('hidden');
  if (opts.onOpen) opts.onOpen();
}
function closeModal() { $('modal').classList.add('hidden'); modalOpen = false; }

function updateTop() {
  $('coins').textContent = fmt(G.coins);
  $('bestStage').textContent = G.best;
  $('owned').textContent = G.ph.length;
  $('partyN').textContent = `${party().length}/${PARTY_MAX}`;
  $('dexN').textContent = G.dex.reduce((a, b) => a + b, 0) + ' / ' + NCOL;
  $('mute').textContent = G.muted ? '🔇' : '🔊';
  const p = rep();
  if (!p) return;
  const C = COLORS[p.c];
  $('repName').innerHTML = `${esc(nameOf(p))} ${stars(p.star)}`;
  $('repSub').innerHTML = `<span style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</span> · ${ELEM[C.elem].i}${ELEM[C.elem].n} · ${STAGE_NAMES[p.st]} 불사조 · Lv.${p.lv}${p.bond >= 100 ? ' · 💖길들여짐' : ''}`;
  const need = expNeed(p.lv);
  const capped = p.lv >= LV_CAP[p.st];
  $('repExp').style.width = (capped ? 100 : (p.xp / need) * 100) + '%';
  $('repExpT').textContent = capped ? (p.st < 2 ? '레벨 상한 · 진화 필요' : 'MAX') : `${fmt(p.xp)} / ${fmt(need)}`;
  $('repBond').style.width = p.bond + '%';
  $('repBondT').textContent = Math.floor(p.bond) + ' / 100';
  const ev = $('aEvolve');
  if (canEvolve(p)) { ev.classList.remove('hidden'); ev.textContent = `✨ ${STAGE_NAMES[p.st + 1]}으로 진화 (${EVO[p.st].cost}🔥)`; }
  else ev.classList.add('hidden');
  const busy = mode !== 'home' || !!evo;
  for (const id of ['aPet', 'aFeed', 'aBond', 'aCatch', 'aEvolve']) $(id).disabled = busy;
}

// ============================================================
// home scene — the original artwork, with your phoenixes on the three rocks
// ============================================================
let mode = 'title';
let tab = 'home';
let T = 0;
let evo = null;
let bubble = null;
let chatterT = 5;
const cam = { ox: null };
const homeAnim = { hop: 0, angry: 0, eat: 0 };

function homeT() {
  const portrait = W / H < 1.15;
  if (portrait && mode === 'title') {
    const sc0 = W / IMG_W;
    return { sc: sc0, ox: 0, oy: Math.max(H * 0.44 - (IMG_H * sc0) / 2, 215), portrait };
  }
  const sc = portrait ? Math.max(W / IMG_W, (H * 0.68) / IMG_H) : Math.max(W / IMG_W, H / IMG_H);
  const p = G ? rep() : null;
  const st = p ? p.st : 1;
  const m = A[STAGE_KEYS[st]];
  const fx = mode === 'title' ? IMG_W / 2 : m.x + m.w / 2;
  const target = clamp(W / 2 - fx * sc, W - IMG_W * sc, 0);
  if (cam.ox === null || Math.abs(cam.ox - target) > W) cam.ox = target;
  cam.ox = lerp(cam.ox, target, 0.08);
  const oy = portrait ? Math.min(0, H * 0.04) : Math.min(0, (H - IMG_H * sc) / 2);
  return { sc, ox: cam.ox, oy, portrait };
}
function slotOccupant(s) {
  if (!G || mode === 'title') return null;
  const r = rep();
  if (r && r.st === s) return r;
  let best = null;
  for (const p of G.ph) if (p.st === s && (!best || p.lv > best.lv || (p.lv === best.lv && COLORS[p.c].rar > COLORS[best.c].rar))) best = p;
  return best;
}
function slotRect(s, t) {
  const m = A[STAGE_KEYS[s]];
  return { x: t.ox + m.x * t.sc, y: t.oy + m.y * t.sc, w: m.w * t.sc, h: m.h * t.sc };
}
function headPos(s, t) { return [t.ox + HEAD[s][0] * t.sc, t.oy + HEAD[s][1] * t.sc]; }

function drawBG(t, dim = 0) {
  ctx.fillStyle = '#120a0d';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(IM.bg, t.ox, t.oy, IMG_W * t.sc, IMG_H * t.sc);
  const bottom = t.oy + IMG_H * t.sc;
  if (bottom < H) {
    const g = ctx.createLinearGradient(0, bottom - 40, 0, H);
    g.addColorStop(0, 'rgba(18,10,13,0)');
    g.addColorStop(0.15, '#1a0f10');
    g.addColorStop(1, '#0b0710');
    ctx.fillStyle = g;
    ctx.fillRect(0, bottom - 40, W, H - bottom + 40);
  }
  if (dim) { ctx.fillStyle = `rgba(8,4,10,${dim})`; ctx.fillRect(0, 0, W, H); }
}

function drawHome() {
  const t = homeT();
  drawBG(t);
  const r = G ? rep() : null;
  for (let s = 0; s < 3; s++) {
    const occ = slotOccupant(s);
    const cid = occ ? occ.c : STARTER_COLOR;
    const R = slotRect(s, t);
    const isRep = occ && r && occ.uid === r.uid;
    const breath = 1 + Math.sin(T * 2 + s * 1.7) * 0.012;
    let hop = 0, shake = 0;
    if (isRep) {
      hop = homeAnim.hop > 0 ? -Math.abs(Math.sin(T * 10)) * 10 * t.sc : 0;
      shake = homeAnim.angry > 0 ? Math.sin(T * 60) * 4 : 0;
      glow(R.x + R.w / 2, R.y + R.h * 0.55, R.w * 0.6, COLORS[cid].glow, homeAnim.angry > 0 ? 0.55 : 0.22);
    }
    if (COLORS[cid].rar === 5) { glow(R.x + R.w / 2, R.y + R.h * 0.5, R.w * 0.7, '255,236,150', 0.3); drawHalo(R.x + R.w / 2, R.y + R.h * 0.48, Math.min(R.w, R.h) * 0.5); }
    ctx.save();
    ctx.translate(R.x + R.w / 2 + shake, R.y + R.h + hop);
    ctx.scale(1, breath);
    if (G && mode !== 'title' && !occ) ctx.globalAlpha = 0.9;
    ctx.drawImage(colored(cid, s, false), -R.w / 2, -R.h, R.w, R.h);
    if (isRep && evo) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, Math.sin(Math.min(1, evo.t / 3) * Math.PI) * 1.2);
      ctx.drawImage(colored(cid, s, false), -R.w / 2, -R.h, R.w, R.h);
    }
    ctx.restore();
    if (Math.random() < 0.25) emit(R.x + rand(0.15, 0.85) * R.w, R.y + rand(0.2, 0.9) * R.h, 1, { angle: -Math.PI / 2, spread: 0.5, smin: 10, smax: 40, rise: 40, rmax: 2.6, color: COLORS[cid].glow });

    // labels exactly where the artwork has them
    const [lx, ly] = LABEL_POS[s];
    const X = t.ox + lx * t.sc, Y = t.oy + ly * t.sc;
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.max(16, 26 * t.sc)}px "Noto Sans KR", sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(STAGE_NAMES[s], X, Y);
    ctx.fillStyle = '#fff';
    ctx.fillText(STAGE_NAMES[s], X, Y);
    if (G && mode !== 'title') {
      ctx.font = `600 ${Math.max(11, 13 * t.sc)}px sans-serif`;
      const sub = occ ? `${isRep ? '👑 ' : ''}${nameOf(occ)} Lv.${occ.lv}` : '야생 · 미보유';
      const sy = Y - Math.max(18, 30 * t.sc);
      ctx.strokeText(sub, X, sy);
      ctx.fillStyle = occ ? (isRep ? '#ffd04a' : '#ffe8d0') : '#c9b0a0';
      ctx.fillText(sub, X, sy);
    }
  }
  drawAmbient();
  drawParts();
  if (r && mode === 'rhythm') drawRhythm(t);
  if (r && bubble) drawBubble(t);
  if (evo) {
    const f = evo.t;
    const a = f < 1.6 ? (f / 1.6) * 0.85 : Math.max(0, 0.85 - (f - 1.6) * 0.8);
    ctx.fillStyle = `rgba(255,240,210,${a})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function say(text, d = 2) { bubble = { text, t: d }; }
function drawBubble(t) {
  const p = rep();
  const [hx, hy] = headPos(p.st, t);
  ctx.font = `600 ${15 * Math.max(0.85, S)}px sans-serif`;
  const tw = ctx.measureText(bubble.text).width;
  const bw = tw + 22, bh = 30;
  const x = clamp(hx + 24 * t.sc, 10, W - bw - 10), y = clamp(hy - 70 * t.sc, 50, H - bh - 10);
  ctx.globalAlpha = Math.min(1, bubble.t * 4);
  ctx.fillStyle = 'rgba(255,248,235,0.95)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 12); else ctx.rect(x, y, bw, bh);
  ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 14, y + bh); ctx.lineTo(x + 6, y + bh + 10); ctx.lineTo(x + 26, y + bh); ctx.fill();
  ctx.fillStyle = '#3a1a0a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, x + 11, y + bh / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
}
const CRY = [['삐약!', '삐약?', '삐삐!'], ['키릭!', '키에엑!', '키이—'], ['끼이이—!', '크르릉…', '끼이—']];

// ============================================================
// home actions
// ============================================================
const cds = {};
function ready(name, t) { if ((cds[name] || 0) > T) return false; cds[name] = T + t; return true; }
function repCenter() {
  const t = homeT(), p = rep(), R = slotRect(p.st, t);
  return [R.x + R.w / 2, R.y + R.h * 0.5, R];
}
function bondGain(p, n) {
  const before = p.bond;
  p.bond = clamp(p.bond + n, 0, 100);
  if (before < 100 && p.bond >= 100) {
    SFX.evolve();
    showModal('💖 길들이기 완료!', `<div class="reveal"><img src="${bigURL(p.c, p.st)}" alt=""></div><p><b>${esc(nameOf(p))}</b>이(가) 당신에게 머리를 숙였습니다.<br>완전히 길들여져 모든 능력치가 +15% 올랐어요.</p>`, [{ label: '좋아!', primary: true }]);
  }
}
function actPet() {
  if (!ready('pet', 0.7)) return;
  const p = rep();
  const [x, y] = repCenter();
  const refuse = clamp(0.45 - p.bond / 50, 0, 0.45);
  if (Math.random() < refuse) {
    homeAnim.angry = 1.1;
    SFX.hiss();
    emit(x, y, 40, { smin: 120, smax: 320, rise: 10, rmax: 5, color: COLORS[p.c].glow });
    say(['삐익! 쉿!', '쉬이익—!', '크아아아!'][p.st]);
    toast('앗 뜨거워! 아직 경계하고 있어요 🔥');
    return;
  }
  homeAnim.hop = 0.9;
  SFX.chirp(p.st);
  for (let i = 0; i < 4; i++) emit(x + rand(-40, 40) * S, y - 30 * S, 1, { kind: 'heart', angle: -Math.PI / 2, spread: 0.4, smin: 40, smax: 80, rise: 0, lmin: 1, lmax: 1.5, rmin: 3, rmax: 4 });
  floatText(x, y - 60 * S, '유대 +2', '#ffb0d0');
  bondGain(p, 2);
  if (Math.random() < 0.5) say(pick(CRY[p.st]), 1.2);
  save();
}
function actFeed() {
  if (!ready('feed', 1.2)) return;
  const p = rep();
  if (G.coins < 10) return toast('불씨가 부족해요. 불씨 잡기나 전투로 모아 보세요');
  G.coins -= 10;
  const [x, y] = repCenter();
  homeAnim.eat = 1;
  SFX.eat();
  emit(x, y - 20 * S, 16, { smin: 40, smax: 160, rise: 40, color: COLORS[p.c].glow });
  const gain = 20 + p.lv * 6;
  const ups = addExp(p, gain);
  bondGain(p, 1);
  floatText(x, y - 70 * S, `경험치 +${gain}`);
  if (ups) { floatText(x, y - 100 * S, `레벨 업! Lv.${p.lv}`, '#ffd04a', 22); SFX.good(); }
  if (p.lv >= LV_CAP[p.st] && p.st < 2) toast('레벨 상한! 진화가 필요해요 ✨');
  say(['냠냠!', '쩝쩝', '크르릉…♪'][p.st], 1.3);
  save();
}
function actEvolve(p) {
  p = p || rep();
  if (!canEvolve(p)) return;
  const cost = EVO[p.st].cost;
  if (G.coins < cost) return toast(`진화에는 불씨 ${cost}개가 필요해요`);
  G.coins -= cost;
  G.rep = p.uid;
  goTab('home');
  evo = { t: 0, uid: p.uid, done: false };
  SFX.evolve();
  toast(`${nameOf(p)}의 몸이 빛나기 시작한다…!`, 2.5);
  save();
}
function updateEvo(dt) {
  if (!evo) return;
  const p = byUid(evo.uid);
  evo.t += dt;
  const [x, y] = repCenter();
  emit(x + rand(-60, 60) * S, y + 60 * S, 4, { angle: -Math.PI / 2, spread: 0.3, smin: 150, smax: 350, rise: 60, rmax: 6, color: COLORS[p.c].glow });
  if (!evo.done && evo.t >= 1.6) {
    evo.done = true;
    p.st++;
    if (p.st === 2) p.bond = Math.min(100, p.bond + 5);
    save();
  }
  if (evo.t >= 3) {
    toast(`${nameOf(p)}이(가) ${STAGE_NAMES[p.st]} 불사조로 진화했다!`, 3);
    say(pick(CRY[p.st]), 2);
    evo = null;
  }
}

// ---------------- 교감 (rhythm) ----------------
let rh = null;
function startBond() {
  if (!ready('bond', 0.5)) return;
  mode = 'rhythm';
  rh = { round: 0, total: 6, r: 0, phase: 'wait', wait: 0.8, res: [], judge: null, judgeT: 0 };
  toast('고리가 금빛 원에 겹칠 때 클릭 / 스페이스!', 2.2);
  syncUI();
}
const rhTarget = () => 60 * Math.max(0.7, S);
function updateRhythm(dt) {
  if (rh.judgeT > 0) rh.judgeT -= dt;
  if (rh.phase === 'wait') {
    rh.wait -= dt;
    if (rh.wait <= 0) {
      if (rh.round >= rh.total) return endBond();
      rh.phase = 'ring';
      rh.r = rhTarget() * 3.2;
    }
  } else {
    rh.r -= rhTarget() * (1.8 + rep().st * 0.4 + rh.round * 0.08) * dt;
    if (rh.r < rhTarget() - 26) judgeRing(true);
  }
}
function judgeRing(timeout) {
  if (!rh || rh.phase !== 'ring') return;
  const d = Math.abs(rh.r - rhTarget());
  const j = timeout ? 'MISS' : d < 8 ? 'PERFECT' : d < 20 ? 'GOOD' : 'MISS';
  rh.res.push(j); rh.judge = j; rh.judgeT = 0.6;
  rh.phase = 'wait'; rh.wait = 0.5; rh.round++;
  const t = homeT(), [hx, hy] = headPos(rep().st, t);
  if (j === 'PERFECT') { SFX.perfect(); emit(hx, hy, 30, { smin: 80, smax: 220, rise: 20 }); homeAnim.hop = 0.5; }
  else if (j === 'GOOD') { SFX.good(); emit(hx, hy, 12, { smin: 60, smax: 140 }); }
  else SFX.miss();
}
function endBond() {
  const p = rep();
  const pf = rh.res.filter((x) => x === 'PERFECT').length, gd = rh.res.filter((x) => x === 'GOOD').length;
  rh = null; mode = 'home';
  const bond = pf * 3 + gd;
  const xp = (pf * 4 + gd * 2) * (3 + p.lv);
  bondGain(p, bond);
  const ups = addExp(p, xp);
  const [x, y] = repCenter();
  floatText(x, y - 80 * S, `유대 +${bond}`, '#ffb0d0');
  floatText(x, y - 105 * S, `경험치 +${xp}`);
  toast(`교감 결과: 완벽 ${pf} · 좋음 ${gd}${ups ? ` · 레벨 업! Lv.${p.lv}` : ''}`, 2.5);
  if (pf + gd >= 5) { homeAnim.hop = 1; say(['삐약삐약♪', '키이—♪', '…(당신을 바라본다)'][p.st]); }
  save();
  syncUI();
}
function drawRhythm(t) {
  const [hx, hy] = headPos(rep().st, t);
  const tr = rhTarget();
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,215,120,0.9)';
  ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(hx, hy, tr, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,120,0.35)';
  ctx.beginPath(); ctx.arc(hx, hy, tr - 20, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, hy, tr + 20, 0, Math.PI * 2); ctx.stroke();
  if (rh.phase === 'ring') {
    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(${COLORS[rep().c].glow},0.95)`;
    ctx.beginPath(); ctx.arc(hx, hy, Math.max(1, rh.r), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.font = '700 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffeedd';
  ctx.fillText(`교감 ${Math.min(rh.round + 1, rh.total)} / ${rh.total}`, W / 2, 70);
  if (rh.judge && rh.judgeT > 0) {
    ctx.font = '800 30px sans-serif';
    ctx.fillStyle = { PERFECT: '#ffe066', GOOD: '#9fe0ff', MISS: '#ff7a7a' }[rh.judge];
    ctx.globalAlpha = Math.min(1, rh.judgeT * 3);
    ctx.fillText({ PERFECT: '완벽!', GOOD: '좋아!', MISS: '실패…' }[rh.judge], hx, hy - tr - 24);
  }
  ctx.restore();
}

// ---------------- 불씨 잡기 ----------------
let ca = null;
function startCatch() {
  mode = 'catch';
  ca = { t: 0, dur: 25, x: W / 2, tx: W / 2, kv: 0, items: [], score: 0, lives: 3, spawn: 0, cheer: 0, over: false };
  toast('그릇을 움직여 불씨를 받으세요! 💧는 피하기', 2.2);
  syncUI();
}
function updateCatch(dt) {
  if (ca.over) return;
  ca.t += dt;
  if (ca.kv) ca.tx = clamp(ca.tx + ca.kv * 700 * S * dt, 0, W);
  ca.x = lerp(ca.x, ca.tx, Math.min(1, dt * 14));
  ca.spawn -= dt;
  const diff = ca.t / ca.dur;
  if (ca.spawn <= 0) {
    ca.spawn = lerp(0.55, 0.28, diff);
    const r = Math.random();
    ca.items.push({ x: rand(30, W - 30), y: -20, vy: rand(160, 240) * S * (1 + diff * 0.8), type: r < 0.62 ? 'ember' : r < 0.78 ? 'fruit' : 'water', ph: rand(0, 6) });
  }
  const by = H - 80 * S, bw = 70 * S;
  for (const it of ca.items) {
    it.y += it.vy * dt;
    it.x += Math.sin(T * 3 + it.ph) * 30 * S * dt;
    if (!it.done && it.y > by - 12 * S && it.y < by + 18 * S && Math.abs(it.x - ca.x) < bw) {
      it.done = true;
      if (it.type === 'water') {
        ca.lives--; SFX.splash();
        emit(it.x, by, 18, { color: '159,216,255', smin: 60, smax: 200, rise: -200, lmax: 0.8 });
        floatText(it.x, by - 30 * S, '치익…', '#9fd8ff');
        if (ca.lives <= 0) endCatch();
      } else {
        const v = it.type === 'fruit' ? 3 : 1;
        ca.score += v; ca.cheer = 0.5; SFX.pick();
        emit(it.x, by - 10 * S, v * 6, { smin: 60, smax: 180 });
        floatText(it.x, by - 30 * S, '+' + v);
      }
    }
  }
  ca.items = ca.items.filter((i) => !i.done && i.y < H + 30);
  ca.cheer = Math.max(0, ca.cheer - dt);
  if (ca.t >= ca.dur) endCatch();
}
function endCatch() {
  if (ca.over) return;
  ca.over = true;
  const s = ca.score, coins = s * 4, xp = s * (4 + rep().lv);
  showModal('불씨 잡기 결과', `<p>모은 불씨: <b>${s}</b></p><p>불씨 +${coins} · ${esc(nameOf(rep()))} 경험치 +${xp}</p>`,
    [{ label: '둥지로', primary: true, fn: () => {
      G.coins += coins;
      const ups = addExp(rep(), xp);
      if (ups) toast(`레벨 업! Lv.${rep().lv}`);
      ca = null; mode = 'home'; homeAnim.hop = 1; save(); syncUI();
    } }]);
}
function drawCatch() {
  const t = homeT();
  drawBG(t, 0.45);
  for (const it of ca.items) {
    if (it.type === 'water') {
      ctx.fillStyle = '#7fc8ff';
      ctx.beginPath();
      ctx.moveTo(it.x, it.y - 14 * S);
      ctx.quadraticCurveTo(it.x + 10 * S, it.y, it.x, it.y + 8 * S);
      ctx.quadraticCurveTo(it.x - 10 * S, it.y, it.x, it.y - 14 * S);
      ctx.fill();
      continue;
    }
    const r = (it.type === 'fruit' ? 13 : 7) * S;
    glow(it.x, it.y, r * 3, '255,150,50', 0.5);
    const g = ctx.createRadialGradient(it.x - r * 0.3, it.y - r * 0.3, 1, it.x, it.y, r);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.5, it.type === 'fruit' ? '#ff7a2a' : '#ffd04a');
    g.addColorStop(1, it.type === 'fruit' ? '#b8200a' : '#ff7a1a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, Math.PI * 2); ctx.fill();
  }
  const by = H - 80 * S, bw = 70 * S;
  glow(ca.x, by, 110 * S, '255,150,50', 0.3 + ca.cheer * 0.6);
  ctx.fillStyle = '#4a2c22';
  ctx.beginPath(); ctx.moveTo(ca.x - bw, by); ctx.quadraticCurveTo(ca.x, by + 60 * S, ca.x + bw, by); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff9a3a';
  ctx.beginPath(); ctx.ellipse(ca.x, by, bw, 9 * S, 0, 0, Math.PI * 2); ctx.fill();
  const p = rep(), img = colored(p.c, p.st, false);
  const h = 150 * S * (ca.cheer > 0 ? 1.05 : 1), w = (img.width / img.height) * h;
  ctx.drawImage(img, W - w - 10, H - h - 10, w, h);
  ctx.font = `700 ${20 * Math.max(0.8, S)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffeedd';
  ctx.fillText(`⏱ ${Math.max(0, Math.ceil(ca.dur - ca.t))}   🔥 ${ca.score}   ${'❤️'.repeat(Math.max(0, ca.lives))}`, W / 2, 40);
  drawParts();
}

// ============================================================
// tabs / sheets
// ============================================================
function syncUI() {
  const inGame = mode !== 'title';
  const inBattle = mode === 'battle';
  const inExplore = mode === 'explore';
  const mini = mode === 'rhythm' || mode === 'catch' || inExplore;
  $('exploreTop').classList.toggle('hidden', !inExplore);
  $('exploreBottom').classList.toggle('hidden', !inExplore);
  $('topbar').classList.toggle('hidden', !inGame || inBattle || mini);
  $('nav').classList.toggle('hidden', !inGame || inBattle || mini);
  $('repCard').classList.toggle('hidden', !inGame || inBattle || mini || tab !== 'home');
  $('homeActions').classList.toggle('hidden', !inGame || inBattle || mini || tab !== 'home');
  $('sheet').classList.toggle('hidden', !inGame || inBattle || mini || tab === 'home');
  $('battleTop').classList.toggle('hidden', !inBattle);
  $('battleBottom').classList.toggle('hidden', !inBattle);
  for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('active', b.dataset.tab === tab);
  if (inGame) updateTop();
}
function goTab(t) {
  tab = t;
  if (t !== 'home') renderSheet();
  syncUI();
}
function renderSheet() {
  ({ storage: renderStorage, fusion: renderFusion, hatch: renderHatch, shop: renderShop, explore: renderExplore, battle: renderBattlePrep, dex: renderDex })[tab]();
}
function tool(label, fn, cls) {
  const b = document.createElement('button');
  b.textContent = label; if (cls) b.className = cls;
  b.onclick = fn;
  $('sheetTools').appendChild(b);
  return b;
}
function cardHTML(p, extra = '') {
  const C = COLORS[p.c];
  return `<div class="card-ph ${extra}" data-uid="${p.uid}" style="border-color:${RARITY_COL[C.rar]}${C.rar === 5 ? ';box-shadow:0 0 14px #ffe680' : ''}">
    ${p.party ? '<span class="badge">출전</span>' : ''}${p.uid === G.rep ? '<span class="badge rep">대표</span>' : ''}
    <img src="${thumbURL(p.c, p.st)}" alt="" loading="lazy">
    <div class="nm">${esc(nameOf(p))}</div>
    <div class="sub">${ELEM[C.elem].i} ${STAGE_NAMES[p.st]} · Lv.${p.lv} ${stars(p.star)}</div>
    <div class="sub" style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]} · ⚡${fmt(statsOf(p).power)}</div>
  </div>`;
}
const SORTS = {
  power: (a, b) => statsOf(b).power - statsOf(a).power,
  lv: (a, b) => b.st - a.st || b.lv - a.lv,
  rar: (a, b) => COLORS[b.c].rar - COLORS[a.c].rar || b.lv - a.lv,
  color: (a, b) => a.c - b.c || b.lv - a.lv,
  new: (a, b) => b.uid - a.uid,
};
const view = { sort: 'power', filter: 'all' };
function filtered() {
  let list = G.ph.slice();
  if (view.filter === 'party') list = list.filter((p) => p.party);
  else if (view.filter === 'rest') list = list.filter((p) => !p.party);
  else if (view.filter !== 'all') list = list.filter((p) => p.st === +view.filter);
  return list.sort(SORTS[view.sort]);
}
function sortFilterTools(onChange) {
  const s = document.createElement('select');
  s.innerHTML = '<option value="power">전투력순</option><option value="lv">레벨순</option><option value="rar">희귀도순</option><option value="color">색상순</option><option value="new">최신순</option>';
  s.value = view.sort;
  s.onchange = () => { view.sort = s.value; onChange(); };
  const f = document.createElement('select');
  f.innerHTML = '<option value="all">전체</option><option value="party">출전 중</option><option value="rest">대기 중</option><option value="0">새끼</option><option value="1">청년</option><option value="2">어른</option>';
  f.value = view.filter;
  f.onchange = () => { view.filter = f.value; onChange(); };
  $('sheetTools').append(s, f);
}

// ---------------- 보관함 ----------------
function renderStorage() {
  $('sheetTools').innerHTML = '';
  $('sheetTitle').textContent = `📦 보관함 (${G.ph.length}마리 · 보관 무제한 · 출전 ${party().length}/${PARTY_MAX})`;
  sortFilterTools(renderStorage);
  tool('💪 가장 센 편성', () => bestPartyAction(renderStorage), 'primary');
  tool('모두 대기', () => { G.ph.forEach((p) => (p.party = false)); save(); renderStorage(); updateTop(); });
  tool('✨ 모두 진화', evolveAll, 'primary');
  const list = filtered();
  $('sheetBody').innerHTML = `<p class="hint">불사조를 눌러 상세 정보를 보고 출전·대표·진화·방생을 할 수 있어요. 출전은 최대 5마리, 보관은 제한이 없어요. '가장 센 편성'을 누르면 전투력이 가장 높은 5마리가 자동으로 출전해요.</p>` +
    (list.length ? `<div class="grid">${list.map((p) => cardHTML(p)).join('')}</div>` : '<p class="hint">해당하는 불사조가 없어요.</p>');
  for (const el of $('sheetBody').querySelectorAll('.card-ph')) el.onclick = () => showDetail(byUid(+el.dataset.uid));
}
// evolve every non-adult phoenix in the current storage view, one stage or all the way to 어른
function evolveAll() {
  const list = filtered().filter((p) => p.st < 2).sort(SORTS.power);
  if (!list.length) return toast('진화할 불사조가 없어요 (모두 어른이에요)');
  const oneCost = list.reduce((a, p) => a + EVO[p.st].cost, 0);
  const fullCost = list.reduce((a, p) => a + (p.st === 0 ? EVO[0].cost + EVO[1].cost : EVO[1].cost), 0);
  const chicks = list.filter((p) => p.st === 0).length, youngs = list.length - chicks;
  const run = (full) => {
    let n = 0, spent = 0, ran = false;
    for (const p of list) {
      while (p.st < 2 && G.coins >= EVO[p.st].cost) {
        G.coins -= EVO[p.st].cost; spent += EVO[p.st].cost;
        p.st++; n++;
        if (p.st === 2) p.bond = Math.min(100, p.bond + 5);
        if (!full) break;
      }
      if (p.st < 2 && G.coins < EVO[p.st].cost) { ran = true; break; }
    }
    save();
    SFX.evolve();
    toast(n ? `✨ ${n}번 진화했어요! (불씨 ${fmt(spent)} 사용)${ran ? ' · 불씨가 모자라 일부만 진화' : ''}` : '불씨가 부족해요', 3);
    renderStorage(); updateTop();
  };
  showModal('✨ 모두 진화', `<p>현재 보관함 목록의 진화 가능한 불사조 <b>${list.length}마리</b> (새끼 ${chicks} · 청년 ${youngs})</p>
    <p class="odds">한 단계씩: 불씨 ${fmt(oneCost)} · 모두 어른까지: 불씨 ${fmt(fullCost)}<br>보유 불씨 ${fmt(G.coins)} — 모자라면 전투력이 높은 순서로 가능한 만큼만 진화해요.</p>`, [
    { label: '취소' },
    { label: `한 단계씩 진화 (${fmt(oneCost)}🔥)`, fn: () => run(false) },
    { label: `모두 어른으로 (${fmt(fullCost)}🔥)`, primary: true, fn: () => run(true) },
  ]);
}
function showDetail(p) {
  const C = COLORS[p.c], s = statsOf(p);
  const need = expNeed(p.lv), cap = p.lv >= LV_CAP[p.st];
  const evoTxt = p.st < 2 ? `진화 비용: 불씨 ${EVO[p.st].cost} (레벨 조건 없음)` : '최종 진화 단계';
  const release = 15 + C.rar * 25 + p.lv * 3;
  const html = `<div class="reveal" style="--glow: rgb(${C.glow})"><img src="${bigURL(p.c, p.st)}" alt=""></div>
    <p style="color:${RARITY_COL[C.rar]};font-weight:700">${RARITY[C.rar]} · ${ELEM[C.elem].i} ${ELEM[C.elem].n} 속성 · ${STAGE_NAMES[p.st]} 불사조 ${stars(p.star)}</p>
    <p>${esc(C.name)}${p.nick ? ` (별명: ${esc(p.nick)})` : ''}</p>
    <table class="st">
      <tr><td>레벨</td><td>${p.lv} / ${LV_CAP[p.st]} ${cap ? '(상한)' : `· 경험치 ${fmt(p.xp)}/${fmt(need)}`}</td></tr>
      <tr><td>체력</td><td>${fmt(s.hp)}</td></tr><tr><td>공격</td><td>${fmt(s.atk)}</td></tr>
      <tr><td>방어</td><td>${fmt(s.def)}</td></tr><tr><td>속도</td><td>${s.spd}</td></tr>
      <tr><td>유대</td><td>${Math.floor(p.bond)} / 100${p.bond >= 100 ? ' 💖' : ''}</td></tr>
      <tr><td>전투력</td><td><b>${fmt(s.power)}</b></td></tr>
    </table>
    <p class="odds">${evoTxt}<br>스킬: 불꽃 쪼기${p.st >= 1 ? ' · 화염 날개(광역)' : ''}${p.st >= 2 ? ' · 부활(1회)' : ''}</p>
    <p><input class="txt" id="nickIn" maxlength="10" placeholder="별명 짓기" value="${esc(p.nick)}"></p>`;
  const btns = [
    { label: p.party ? '⚔️ 출전 해제' : `⚔️ 출전 (${party().length}/${PARTY_MAX})`, fn: () => { setParty(p, !p.party); save(); refreshAfter(); } },
    { label: '👑 대표로', disabled: p.uid === G.rep, fn: () => { G.rep = p.uid; save(); toast(`${nameOf(p)}이(가) 대표 불사조가 되었어요`); refreshAfter(); } },
  ];
  if (p.st < 2) btns.push({ label: `✨ 진화 (${EVO[p.st].cost}🔥)`, primary: true, disabled: !canEvolve(p) || G.coins < EVO[p.st].cost, fn: () => actEvolve(p) });
  btns.push({ label: `🕊 방생 (+${release}🔥)`, disabled: G.ph.length <= 1, fn: () => {
    showModal('방생할까요?', `<p>${esc(nameOf(p))} Lv.${p.lv}을(를) 하늘로 돌려보내고 불씨 ${release}개를 받습니다.</p>`, [
      { label: '취소', fn: () => showDetail(p) },
      { label: '방생', primary: true, fn: () => { G.ph = G.ph.filter((q) => q !== p); G.coins += release; rep(); save(); refreshAfter(); } },
    ]);
  } });
  btns.push({ label: '닫기', fn: refreshAfter });
  showModal(nameOf(p), html, btns);
  const inp = $('nickIn');
  inp.onchange = () => { p.nick = inp.value.trim().slice(0, 10); save(); $('mTitle').textContent = nameOf(p); };
}
function refreshAfter() { if (tab !== 'home') renderSheet(); updateTop(); }

// ---------------- 합성 ----------------
const fz = { a: null, b: null, slot: 'a' };
function fusionCost(a, b) { return 50 * (Math.max(a.st, b.st) + 1) + 20 * Math.max(COLORS[a.c].rar, COLORS[b.c].rar); }
function fusionOdds(a, b) {
  const ca = COLORS[a.c], cb = COLORS[b.c];
  if (a.c === b.c) return { same: true };
  const rar = Math.max(ca.rar, cb.rar);
  const up = rar >= 5 ? 0 : rar === 4 ? (ca.rar === 4 && cb.rar === 4 ? 0.1 : 0) : ca.rar === cb.rar ? 0.35 : 0.2;
  return { rar, up };
}
function hueBlend(ca, cb) {
  if (ca.hIdx < 0 && cb.hIdx < 0) return -1;
  if (ca.hIdx < 0) return cb.hIdx;
  if (cb.hIdx < 0) return ca.hIdx;
  let d = cb.hIdx - ca.hIdx;
  if (d > 10) d -= 20; if (d < -10) d += 20;
  return (((ca.hIdx + Math.round(d / 2)) % 20) + 20) % 20;
}
function doFuse(a, b) {
  const ca = COLORS[a.c], cb = COLORS[b.c];
  let cid, star = Math.max(a.star, b.star), upgraded = false;
  if (a.c === b.c) { cid = a.c; star = Math.min(5, star + 1); }
  else {
    const o = fusionOdds(a, b);
    let rar = o.rar;
    if (Math.random() < o.up) { rar++; upgraded = true; }
    const pool = COLORS.filter((c) => c.rar === rar);
    const hi = hueBlend(ca, cb);
    const near = hi < 0 ? pool : pool.filter((c) => c.hIdx === hi);
    cid = pick(near.length ? near : pool).id;
  }
  const isNew = !G.dex[cid];
  const wasRep = G.rep === a.uid || G.rep === b.uid;
  const st = Math.max(a.st, b.st);
  const lv = Math.min(LV_CAP[st], Math.max(a.lv, b.lv));
  G.ph = G.ph.filter((p) => p !== a && p !== b);
  const np = addPhoenix({ c: cid, st, lv, star, bond: Math.max(a.bond, b.bond), party: a.party || b.party });
  trimParty();
  if (wasRep) G.rep = np.uid;
  return { np, upgraded, isNew };
}
function renderFusion() {
  $('sheetTools').innerHTML = '';
  $('sheetTitle').textContent = '🧬 합성';
  if (fz.a && !byUid(fz.a)) fz.a = null;
  if (fz.b && !byUid(fz.b)) fz.b = null;
  const a = fz.a && byUid(fz.a), b = fz.b && byUid(fz.b);
  const slot = (p, k) => `<div class="slot ${fz.slot === k ? 'active' : ''}" data-slot="${k}">${p ? `<img src="${thumbURL(p.c, p.st)}" alt=""><b>${esc(nameOf(p))}</b><span class="odds">${STAGE_NAMES[p.st]} Lv.${p.lv} ${stars(p.star)}</span>` : `<span class="op">＋</span>재료 ${k === 'a' ? 1 : 2} 선택`}</div>`;
  let info = '<p class="odds">두 불사조를 골라 합성하면 하나의 새 불사조가 태어나요. 재료 두 마리는 사라집니다.</p>';
  let canGo = false, cost = 0;
  if (a && b) {
    const o = fusionOdds(a, b);
    cost = fusionCost(a, b);
    canGo = G.coins >= cost;
    info = o.same
      ? `<p class="odds"><b>같은 색끼리 합성</b>: 같은 색이 유지되고 <span class="stars">★</span>이 1개 올라가요 (최대 5, 별당 능력치 +12%).</p>`
      : `<p class="odds">결과: 두 색이 섞인 <b style="color:${RARITY_COL[o.rar]}">${RARITY[o.rar]}</b> 불사조${o.up ? `<br>✨ ${Math.round(o.up * 100)}% 확률로 한 단계 위 <b style="color:${RARITY_COL[o.rar + 1]}">${RARITY[o.rar + 1]}</b>로 승급` : ''}</p>`;
    info += `<p class="odds">단계는 높은 쪽(${STAGE_NAMES[Math.max(a.st, b.st)]}), 레벨·유대·별은 높은 쪽을 이어받아요. 비용: 불씨 ${cost}</p>`;
  }
  const list = filtered().filter((p) => p.uid !== (fz.slot === 'a' ? fz.b : fz.a));
  $('sheetBody').innerHTML = `<div class="slots">${slot(a, 'a')}<span class="op">+</span>${slot(b, 'b')}<span class="op">=</span>
    <div class="slot"><span class="op">?</span>새 불사조</div></div>
    <div class="center">${info}<button id="fuseGo" class="primary" ${canGo ? '' : 'disabled'}>🧬 합성하기${cost ? ` (${cost}🔥)` : ''}</button></div>
    <p class="hint" style="margin-top:14px">아래에서 <b>재료 ${fz.slot === 'a' ? 1 : 2}</b>을(를) 고르세요.</p>
    <div class="grid">${list.map((p) => cardHTML(p, p.uid === fz.a || p.uid === fz.b ? 'sel' : '')).join('')}</div>`;
  sortFilterTools(renderFusion);
  for (const el of $('sheetBody').querySelectorAll('.slot[data-slot]')) el.onclick = () => { fz.slot = el.dataset.slot; renderFusion(); };
  for (const el of $('sheetBody').querySelectorAll('.card-ph')) el.onclick = () => {
    fz[fz.slot] = +el.dataset.uid;
    if (fz.slot === 'a' && !fz.b) fz.slot = 'b';
    renderFusion();
  };
  $('fuseGo').onclick = () => {
    if (!a || !b || G.coins < cost) return;
    G.coins -= cost;
    const r = doFuse(a, b);
    fz.a = fz.b = null; fz.slot = 'a';
    save();
    SFX.evolve();
    const C = COLORS[r.np.c];
    showModal(r.upgraded ? '✨ 승급 합성 성공! ✨' : '🧬 합성 완료',
      `<div class="reveal" style="--glow: rgb(${C.glow})"><img src="${bigURL(r.np.c, r.np.st)}" alt=""></div>
       <p><b style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</b> ${esc(C.name)} ${stars(r.np.star)}${r.isNew ? ' <b style="color:#ffd04a">NEW!</b>' : ''}</p>
       <p>${STAGE_NAMES[r.np.st]} · Lv.${r.np.lv} · 전투력 ${fmt(statsOf(r.np).power)}</p>`,
      [{ label: '확인', primary: true, fn: renderFusion }]);
    updateTop();
  };
}

// ---------------- 부화 ----------------
const EGG_W = [60, 28, 9, 2.7, 0.3];
const EGG_PRICE = { 1: 1, 10: 10, 100: 100 };
function rollRarity(bonus = 0) {
  const w = EGG_W.map((v, i) => (i === 0 ? Math.max(5, v - bonus * 60) : v * (1 + bonus * i)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}
const randomColorOf = (rar) => pick(COLORS.filter((c) => c.rar === rar)).id;
function renderHatch() {
  $('sheetTools').innerHTML = '';
  $('sheetTitle').textContent = '🥚 부화';
  $('sheetBody').innerHTML = `<div class="center">
    <canvas id="eggCv" width="220" height="220" style="width:180px;height:180px;position:static;margin:0 auto"></canvas>
    <p class="hint">가지고 있는 알은 모두 공짜로 부화해요. 부화하면 200가지 색 중 하나가 <b>Lv.40~45</b> 새끼 불사조로 태어나요. 신 등급 10종은 상점의 신의 알, 50스테이지마다 나오는 신의 보스, 천공의 성역 탐험, 신화끼리의 합성으로 얻을 수 있어요.</p>
    <h3 style="color:var(--accent);margin:10px 0 8px">🥚 보유한 알 — 공짜로 부화</h3>
    ${EGG_IDS.some((id) => inv(id)) ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));text-align:left">${EGG_IDS.filter((id) => inv(id)).map((id) => `
      <div class="card-ph" style="border-color:${id === 'god_egg' || id === 'myth_egg' ? '#fff1a0' : id === 'luck_egg' ? '#ffb347' : '#6a4a3a'};padding:10px;cursor:default;text-align:left">
        <div class="nm" style="font-size:16px">${ITEM[id].icon} ${ITEM[id].name} ×${fmt(inv(id))}</div>
        <div class="sub" style="margin:4px 0 8px">${ITEM[id].desc}</div>
        <div class="row" style="justify-content:flex-start;margin:0">
          <button class="primary" data-hatch="${id}" data-n="1">1개 부화 (무료)</button>
          ${inv(id) > 1 ? `<button class="primary" data-hatch="${id}" data-n="${inv(id)}">모두 부화 (${fmt(inv(id))}개)</button>` : ''}
        </div></div>`).join('')}</div>`
      : '<p class="hint">보유한 알이 없어요. 아래에서 사거나, 상점·탐험·보스 전투에서 얻으면 여기에 나타나요.</p>'}
    <h3 style="color:var(--accent);margin:16px 0 8px">🛒 알 사기 (보유한 알에 추가돼요)</h3>
    <div class="row"><button id="egg1">알 1개 (${EGG_PRICE[1]}🔥)</button><button id="egg10">알 10개 (${EGG_PRICE[10]}🔥)</button><button id="egg100">알 100개 (${fmt(EGG_PRICE[100])}🔥)</button></div>
    <p class="odds" style="margin-top:12px">${EGG_W.map((w, i) => `<span style="color:${RARITY_COL[i]}">${RARITY[i]} ${w}%</span>`).join(' · ')} · <span style="color:${RARITY_COL[5]}">신 등급은 일반 알에서 나오지 않아요</span><br>신화 10종(흑염·백염·무지개·은하·황혼·태초·심연·오로라·성운·불멸)은 부화, 합성 승급, 보스 포획, 천공의 성역 탐험으로 얻을 수 있어요.</p>
  </div>`;
  for (const n of [1, 10, 100]) {
    $('egg' + n).disabled = G.coins < EGG_PRICE[n];
    $('egg' + n).onclick = () => {
      if (G.coins < EGG_PRICE[n]) return toast('불씨가 부족해요');
      G.coins -= EGG_PRICE[n];
      addItem('egg', n);
      SFX.pick();
      toast(`🥚 알 ${n}개를 보유한 알에 넣었어요`);
      save(); renderHatch(); updateTop();
    };
  }
  for (const b of $('sheetBody').querySelectorAll('[data-hatch]')) b.onclick = () => hatchEggs(b.dataset.hatch, +b.dataset.n);
  drawEgg();
  if (!eggRAF) eggRAF = requestAnimationFrame(eggTick);
}
function drawEgg() {
  const c = $('eggCv');
  if (!c) return;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 220, 220);
  const gl = g.createRadialGradient(110, 120, 10, 110, 120, 110);
  gl.addColorStop(0, 'rgba(255,170,60,0.6)'); gl.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = gl; g.fillRect(0, 0, 220, 220);
  const eg = g.createRadialGradient(90, 80, 5, 110, 115, 90);
  eg.addColorStop(0, '#fff6d0'); eg.addColorStop(0.4, '#ffc24a'); eg.addColorStop(0.85, '#e0600f'); eg.addColorStop(1, '#8a2a08');
  g.fillStyle = eg;
  g.beginPath(); g.ellipse(110, 118, 58, 76, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,240,180,0.7)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(70, 110); g.quadraticCurveTo(110, 90, 150, 112); g.stroke();
  g.beginPath(); g.moveTo(68, 140); g.quadraticCurveTo(110, 160, 152, 138); g.stroke();
  c.style.transform = `rotate(${Math.sin(T * 3) * 4}deg)`;
}
let eggRAF = 0;
function eggTick() {
  eggRAF = 0;
  if (tab !== 'hatch' || mode !== 'home' || !$('eggCv')) return;
  drawEgg();
  eggRAF = requestAnimationFrame(eggTick);
}
const EGG_IDS = ['egg', 'luck_egg', 'myth_egg', 'god_egg'];
function eggRarity(id) {
  if (id === 'god_egg') return 5;
  if (id === 'myth_egg') return 4;
  if (id === 'luck_egg') return Math.random() < 0.7 ? 2 : Math.random() < 0.85 ? 3 : 4;
  return rollRarity();
}
function hatchEggs(id, n) {
  n = Math.min(n, inv(id));
  if (n <= 0) return;
  addItem(id, -n);
  const got = [];
  for (let i = 0; i < n; i++) {
    const cid = randomColorOf(eggRarity(id));
    const isNew = !G.dex[cid];
    got.push({ p: addPhoenix({ c: cid, st: 0, lv: hatchLevel(), party: false }), isNew });
  }
  save();
  SFX.evolve();
  let html;
  if (n === 1) {
    const { p, isNew } = got[0], C = COLORS[p.c];
    html = `<div class="reveal" style="--glow: rgb(${C.glow})"><img src="${bigURL(p.c, 0)}" alt=""></div><p><b style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</b> ${esc(C.name)} · <b>Lv.${p.lv}</b>${isNew ? ' <b style="color:#ffd04a">NEW!</b>' : ''}</p>`;
  } else {
    const shown = got.slice().sort((a, b) => COLORS[b.p.c].rar - COLORS[a.p.c].rar || b.isNew - a.isNew).slice(0, 120);
    html = (n > 120 ? `<p class="odds">희귀한 순으로 120마리만 보여 줘요 (총 ${fmt(n)}마리)</p>` : '') + `<div class="reveal-grid">${shown.map(({ p, isNew }, i) => { const C = COLORS[p.c]; return `<div style="border-color:${RARITY_COL[C.rar]};animation-delay:${Math.min(i * 0.08, 0.8 + i * 0.01).toFixed(2)}s"><img src="${thumbURL(p.c, 0)}" alt="">${esc(C.short)}<br>Lv.${p.lv}${isNew ? '<br><b style="color:#ffd04a">NEW</b>' : ''}</div>`; }).join('')}</div>`;
  }
  showModal(n === 1 ? `${ITEM[id].icon} 부화!` : `${ITEM[id].icon} ${fmt(n)}개 부화!`, html + '<p class="odds">새 불사조는 보관함에 들어갔어요. 보관함에서 출전시킬 수 있어요.</p>', [{ label: '확인', primary: true, fn: renderHatch }]);
  updateTop();
}

// ---------------- 도감 ----------------
function renderDex() {
  $('sheetTools').innerHTML = '';
  const n = G.dex.reduce((a, b) => a + b, 0);
  $('sheetTitle').textContent = `📖 도감 ${n} / ${NCOL}`;
  $('sheetBody').innerHTML = `<p class="hint">200가지 색 + 신 등급 10종. 발견한 불사조는 밝게 표시돼요. 도감 10종마다 보상을 받을 수 있어요.</p>
    <div class="grid">${COLORS.map((C) => {
      const known = G.dex[C.id];
      return `<div class="card-ph ${known ? '' : 'unknown'}" style="border-color:${known ? RARITY_COL[C.rar] : '#333'};cursor:default">
        <img src="${thumbURL(C.id, 0)}" alt="" loading="lazy">
        <div class="nm">#${String(C.id + 1).padStart(3, '0')} ${known ? esc(C.short) : '???'}</div>
        <div class="sub">${known ? `${ELEM[C.elem].i} <span style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</span>` : '미발견'}</div></div>`;
    }).join('')}</div>`;
  G.dexClaim = G.dexClaim || 0;
  const claimable = Math.floor(n / 10) - G.dexClaim;
  const b = tool(claimable > 0 ? `🎁 도감 보상 받기 (${claimable})` : '🎁 도감 보상', () => {
    if (claimable <= 0) return;
    const coins = claimable * 300;
    G.dexClaim += claimable; G.coins += coins; save();
    toast(`도감 보상: 불씨 +${coins}`); renderDex(); updateTop();
  }, claimable > 0 ? 'primary' : '');
  b.disabled = claimable <= 0;
}

// ---------------- 전투 준비 ----------------
function renderBattlePrep() {
  $('sheetTools').innerHTML = '';
  $('sheetTitle').textContent = '⚔️ AI 전투';
  const pt = party();
  const pw = pt.reduce((a, p) => a + statsOf(p).power, 0);
  const N = clamp(G.stage, 1, G.best);
  G.stage = N;
  const preview = enemyPlan(N, pt.length);
  $('sheetBody').innerHTML = `<div class="center">
    <p class="hint">출전 중인 불사조 <b>${pt.length} / ${PARTY_MAX}마리</b>가 AI 불사조 군단과 자동으로 싸워요.<br>속성 상성: 🔥화 → 🍃풍 → 💧수 → 🔥화, 🔮영과 ✨신성은 모두에게 강해요.</p>
    <div class="row" style="align-items:center">
      <button id="stPrev">◀</button>
      <div class="chip" style="font-size:16px">스테이지 <b>${N}</b>${N % 5 === 0 ? ' 👹보스' : ''}</div>
      <button id="stNext">▶</button>
    </div>
    <p class="odds">아군 전투력 ${fmt(pw)} · 적 예상: ${preview.n}마리, Lv.${preview.lv} 전후${N % 5 === 0 ? ', 보스 1마리' : ''}<br>
    최고 기록 스테이지 ${G.best} · 승리하면 다음 스테이지가 열리고, 야생 불사조를 포획할 수 있어요.</p>
    <div class="row" style="align-items:center;margin-top:4px">
      <span class="odds">난이도</span>
      <select id="diffSel">${Object.entries(DIFF).map(([k, d]) => `<option value="${k}" ${(G.diff || 'normal') === k ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
      <span class="odds">공격 연출</span>
      <select id="fxSel"><option value="simple" ${G.fx !== 'fancy' ? 'selected' : ''}>간단하게</option><option value="fancy" ${G.fx === 'fancy' ? 'selected' : ''}>화려하게</option></select>
    </div>
    <label class="odds"><input type="checkbox" id="autoNext" ${G.autoNext ? 'checked' : ''}> 승리하면 자동으로 다음 스테이지 진행</label>
    <div class="odds" style="margin-top:8px">전투 아이템 (전투마다 1개씩 소모): ${BATTLE_ITEMS.map((it) => `<label style="margin:0 6px;white-space:nowrap;${inv(it.id) ? '' : 'opacity:.4'}"><input type="checkbox" data-bi="${it.id}" ${inv(it.id) && G.useNext && G.useNext[it.id] ? 'checked' : ''} ${inv(it.id) ? '' : 'disabled'}> ${it.icon}${it.name} ×${inv(it.id)}</label>`).join('')}<br><span>아이템은 🛒 상점에서 살 수 있어요.</span></div>
    <div class="row"><button id="bestTeam">💪 가장 센 편성</button><button id="goBattle" class="primary" ${pt.length ? '' : 'disabled'}>⚔️ 전투 시작</button></div>
    <p class="hint" style="margin-top:14px">출전 불사조 (보관함에서 출전·해제)</p>
  </div>
  <div class="grid">${pt.sort(SORTS.power).map((p) => cardHTML(p)).join('') || '<p class="hint">출전 중인 불사조가 없어요.</p>'}</div>`;
  $('stPrev').disabled = N <= 1;
  $('stNext').disabled = N >= G.best;
  $('stPrev').onclick = () => { G.stage = N - 1; renderBattlePrep(); };
  $('stNext').onclick = () => { G.stage = N + 1; renderBattlePrep(); };
  $('autoNext').onchange = (e) => { G.autoNext = e.target.checked; save(); };
  $('diffSel').onchange = (e) => { G.diff = e.target.value; save(); renderBattlePrep(); };
  $('fxSel').onchange = (e) => { G.fx = e.target.value; save(); };
  $('goBattle').onclick = () => startBattle(N);
  $('bestTeam').onclick = () => bestPartyAction(renderBattlePrep);
  for (const cb of $('sheetBody').querySelectorAll('[data-bi]')) cb.onchange = () => { G.useNext = G.useNext || {}; G.useNext[cb.dataset.bi] = cb.checked; save(); };
  for (const el of $('sheetBody').querySelectorAll('.card-ph')) el.onclick = () => showDetail(byUid(+el.dataset.uid));
}

// ============================================================
// shop & items
// ============================================================
const ITEMS = [
  { id: 'exp_s', name: '경험치 물약', icon: '🧪', price: 1, use: 'ph', desc: '불사조 1마리 경험치 +300' },
  { id: 'exp_l', name: '큰 경험치 물약', icon: '⚗️', price: 1, use: 'ph', desc: '불사조 1마리 경험치 +1,500' },
  { id: 'bond', name: '유대의 깃털', icon: '🪶', price: 1, use: 'ph', desc: '불사조 1마리 유대 +20' },
  { id: 'star', name: '별의 조각', icon: '⭐', price: 1, use: 'ph', desc: '불사조 1마리 별 +1 (최대 5, 별당 능력치 +12%)' },
  { id: 'stam', name: '기력 물약', icon: '⚡', price: 1, use: 'now', desc: '탐험 기력 +10' },
  { id: 'bait', name: '황금 먹이', icon: '🍯', price: 1, use: 'explore', desc: '탐험에서 야생 불사조에게 사용: 포획 판정 범위 +60%' },
  { id: 'charm', name: '길들이기 부적', icon: '🧿', price: 1, use: 'explore', desc: '탐험에서 사용: 포획 게이지가 40%에서 시작' },
  { id: 'atk', name: '분노의 비약', icon: '💢', price: 1, use: 'battle', desc: '전투 1회 동안 아군 공격력 +30%' },
  { id: 'def', name: '수호의 비약', icon: '🛡️', price: 1, use: 'battle', desc: '전투 1회 동안 아군 방어력 +30%' },
  { id: 'rev', name: '불사의 깃털', icon: '🕊️', price: 1, use: 'battle', desc: '전투 1회 동안 모든 아군이 한 번 더 부활' },
  { id: 'ult', name: '폭풍의 핵', icon: '🌪️', price: 1, use: 'battle', desc: '전투 시작부터 피닉스 폭풍 게이지 100%' },
  { id: 'egg', name: '불사조의 알', icon: '🥚', price: 1, use: 'egg', desc: '일반 알 (모든 등급이 나올 수 있어요)' },
  { id: 'luck_egg', name: '행운의 알', icon: '🐣', price: 1, use: 'egg', desc: '영웅 등급 이상 확정 부화' },
  { id: 'myth_egg', name: '신화의 알', icon: '🌈', price: 1, use: 'egg', desc: '신화 등급 확정 부화' },
  { id: 'god_egg', name: '신의 알', icon: '👑', price: 1, use: 'egg', desc: '신 등급 불사조 확정 부화 (10종 중 하나)' },
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const BATTLE_ITEMS = ITEMS.filter((i) => i.use === 'battle');
const inv = (id) => (G.inv && G.inv[id]) || 0;
function addItem(id, n) {
  G.inv = G.inv || {};
  G.inv[id] = (G.inv[id] || 0) + n;
  if (G.inv[id] <= 0) delete G.inv[id];
}
const USE_WHERE = { egg: '부화 탭에서 공짜로 부화', ph: '불사조에게 사용', now: '바로 사용', explore: '탐험 포획 때 사용', battle: '전투 준비에서 사용' };
function renderShop() {
  $('sheetTools').innerHTML = '';
  $('sheetTitle').textContent = '🛒 상점';
  const owned = ITEMS.filter((i) => inv(i.id) > 0);
  $('sheetBody').innerHTML = `<p class="hint">불씨로 아이템을 사서 가방에 보관하세요. 보유 불씨 🔥 <b>${fmt(G.coins)}</b></p>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${ITEMS.map((it) => `
      <div class="card-ph" style="border-color:${it.id === 'god_egg' || it.id === 'myth_egg' ? '#fff1a0' : it.id === 'luck_egg' || it.id === 'star' ? '#ffb347' : '#6a4a3a'};text-align:left;padding:10px;cursor:default">
        <div class="nm" style="font-size:15px">${it.icon} ${it.name} <span class="sub">(보유 ${inv(it.id)})</span></div>
        <div class="sub" style="margin:4px 0 6px;min-height:30px">${it.desc}<br><i>${USE_WHERE[it.use]}</i></div>
        <div class="row" style="justify-content:flex-start;margin-top:4px">
          <button data-buy="${it.id}" data-n="1" ${G.coins < it.price ? 'disabled' : ''}>🔥${fmt(it.price)} 구매</button>
          <button data-buy="${it.id}" data-n="10" ${G.coins < it.price * 10 ? 'disabled' : ''}>×10 (🔥${fmt(it.price * 10)})</button>
          <button data-buy="${it.id}" data-n="100" ${G.coins < it.price * 100 ? 'disabled' : ''}>×100 (🔥${fmt(it.price * 100)})</button>
        </div></div>`).join('')}</div>
    <h3 style="color:var(--accent);margin:18px 0 8px">🎒 가방</h3>
    ${owned.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${owned.map((it) => `
      <div class="card-ph" style="border-color:#6a4a3a;text-align:left;padding:10px;cursor:default">
        <div class="nm" style="font-size:15px">${it.icon} ${it.name} ×${inv(it.id)}</div>
        <div class="sub" style="margin:4px 0 6px">${it.desc}</div>
        ${it.use === 'egg' ? `<button class="primary" data-gohatch="1">🥚 부화하러 가기</button>` : it.use === 'ph' || it.use === 'now' ? `<button class="primary" data-use="${it.id}">사용하기</button>` : `<span class="sub"><i>${USE_WHERE[it.use]}</i></span>`}
      </div>`).join('')}</div>` : '<p class="hint">가방이 비어 있어요.</p>'}`;
  for (const b of $('sheetBody').querySelectorAll('[data-buy]')) b.onclick = () => buyItem(b.dataset.buy, +b.dataset.n);
  for (const b of $('sheetBody').querySelectorAll('[data-use]')) b.onclick = () => useItem(b.dataset.use);
  for (const b of $('sheetBody').querySelectorAll('[data-gohatch]')) b.onclick = () => goTab('hatch');
}
function buyItem(id, n) {
  const it = ITEM[id], cost = it.price * n;
  if (G.coins < cost) return toast('불씨가 부족해요');
  G.coins -= cost;
  addItem(id, n);
  SFX.pick();
  toast(it.use === 'egg' ? `${it.icon} ${it.name} ×${n} → 부화 탭에 들어갔어요 (공짜 부화)` : `${it.icon} ${it.name} ×${n} 구매!`);
  save(); renderShop(); updateTop();
}
function pickPhoenix(title, fn) {
  const list = G.ph.slice().sort(SORTS.power);
  showModal(title, `<p class="odds">사용할 불사조를 고르세요</p><div class="grid" style="max-height:55vh;overflow:auto">${list.map((p) => cardHTML(p)).join('')}</div>`, [{ label: '취소' }]);
  for (const el of $('mBody').querySelectorAll('.card-ph')) el.onclick = () => { closeModal(); fn(byUid(+el.dataset.uid)); };
}
function useItem(id) {
  const it = ITEM[id];
  if (!inv(id)) return;
  if (it.use === 'ph') return pickPhoenix(`${it.icon} ${it.name} 사용`, (p) => applyToPhoenix(id, p));
  if (id === 'stam') {
    if (stam() >= STAM_MAX) return toast('탐험 기력이 이미 가득해요');
    G.stam = Math.min(STAM_MAX, stam() + 10);
    addItem(id, -1);
    toast('⚡ 탐험 기력 +10');
  }
  save(); renderShop(); updateTop();
}
function applyToPhoenix(id, p) {
  const it = ITEM[id];
  let msg = '';
  if (id === 'star') {
    if (p.star >= 5) return toast('이미 별이 최대(5)예요');
    p.star++; msg = `별 ★${p.star}`;
  } else if (id === 'bond') {
    if (p.bond >= 100) return toast('이미 완전히 길들여졌어요');
    bondGain(p, 20); msg = `유대 ${Math.floor(p.bond)}`;
  } else {
    if (p.lv >= LV_CAP[p.st]) return toast(p.st < 2 ? '레벨 상한이에요. 불씨로 진화시켜 주세요' : '이미 최대 레벨이에요');
    const before = p.lv;
    addExp(p, id === 'exp_l' ? 1500 : 300);
    msg = p.lv > before ? `레벨 업! Lv.${before} → Lv.${p.lv}` : '경험치 획득';
  }
  addItem(id, -1);
  SFX.good();
  toast(`${it.icon} ${nameOf(p)}: ${msg}`);
  save(); if (tab === 'shop') renderShop(); updateTop();
}

// ============================================================
// exploration — roam regions, meet wild phoenixes and capture them
// ============================================================
const REGIONS = [
  { name: '잿빛 협곡', icon: '🌋', elem: 'fire', lv: [1, 8], unlock: 1, rb: 0, tint: 'rgba(255,90,30,0.10)', desc: '🔥화 속성 불사조가 자주 나타나는 협곡' },
  { name: '비취 숲', icon: '🌲', elem: 'wind', lv: [5, 15], unlock: 3, rb: 0.05, tint: 'rgba(30,150,70,0.30)', desc: '🍃풍 속성 불사조가 둥지를 튼 숲' },
  { name: '푸른 폭포', icon: '💧', elem: 'water', lv: [10, 22], unlock: 8, rb: 0.1, tint: 'rgba(30,100,210,0.30)', desc: '💧수 속성 불사조가 모이는 폭포' },
  { name: '자수정 동굴', icon: '🔮', elem: 'spirit', lv: [18, 32], unlock: 15, rb: 0.2, tint: 'rgba(110,30,170,0.38)', desc: '🔮영 속성 불사조가 잠든 동굴' },
  { name: '천공의 성역', icon: '✨', elem: null, lv: [28, 45], unlock: 25, rb: 0.45, tint: 'rgba(255,240,200,0.16)', desc: '희귀·전설·신화 불사조가 깃드는 하늘의 땅' },
];
const STAM_MAX = 20, STAM_SEC = 45;
function stam() {
  const now = Date.now();
  if (G.stam === undefined) { G.stam = STAM_MAX; G.stamT = now; }
  if (G.stam >= STAM_MAX) { G.stamT = now; return G.stam; }
  const gained = Math.floor((now - G.stamT) / 1000 / STAM_SEC);
  if (gained > 0) {
    G.stam = Math.min(STAM_MAX, G.stam + gained);
    G.stamT += gained * STAM_SEC * 1000;
    if (G.stam >= STAM_MAX) G.stamT = now;
  }
  return G.stam;
}
function renderExplore() {
  $('sheetTools').innerHTML = '';
  $('sheetTitle').textContent = '🧭 탐험';
  const st0 = stam();
  const next = st0 >= STAM_MAX ? '가득 참' : `${Math.ceil(STAM_SEC - ((Date.now() - G.stamT) / 1000) % STAM_SEC)}초 후 +1`;
  $('sheetBody').innerHTML = `<p class="hint">지역을 골라 탐색하면 야생 불사조를 만날 수 있어요. 고리 타이밍을 맞춰 길들이면 포획!<br>
    탐험 기력 ⚡ <b>${st0} / ${STAM_MAX}</b> (${next}) · 탐색 1회에 ⚡1</p>
    <div class="row" style="justify-content:flex-start;margin:0 0 12px"><button id="stamBuy" ${G.coins < 100 || st0 >= STAM_MAX ? 'disabled' : ''}>⚡ 기력 +10 충전 (100🔥)</button></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">${REGIONS.map((R, i) => {
      const open = G.best >= R.unlock;
      return `<div class="card-ph ${open ? '' : 'dim'}" data-r="${i}" style="border-color:${open ? '#ffb347' : '#444'};text-align:left;padding:12px;pointer-events:auto">
        <div class="nm" style="font-size:16px">${R.icon} ${R.name}</div>
        <div class="sub" style="margin:4px 0">${R.desc}</div>
        <div class="sub">야생 Lv.${R.lv[0]}~${R.lv[1]}${R.rb ? ` · 희귀 출현 ↑${Math.round(R.rb * 100)}%` : ''}</div>
        <div class="sub" style="color:${open ? '#8aff9a' : '#ff9a9a'}">${open ? '탐험 가능' : `🔒 전투 스테이지 ${R.unlock} 도달 시 개방`}</div></div>`;
    }).join('')}</div>`;
  $('stamBuy').onclick = () => { if (G.coins < 100) return; G.coins -= 100; G.stam = Math.min(STAM_MAX, stam() + 10); save(); renderExplore(); updateTop(); };
  for (const el of $('sheetBody').querySelectorAll('.card-ph[data-r]')) el.onclick = () => {
    const R = REGIONS[+el.dataset.r];
    if (G.best < R.unlock) return toast(`전투 스테이지 ${R.unlock}에 도달하면 열려요`);
    startExplore(+el.dataset.r);
  };
}

let X = null;
function startExplore(ri) {
  X = { ri, phase: 'idle', t: 0, walk: 0, wild: null, gauge: 0, tries: 0, bait: 0, ring: 0, judge: null, judgeT: 0, appear: 0, msg: `${REGIONS[ri].icon} ${REGIONS[ri].name}에 도착했다. 탐색해 보자!` };
  mode = 'explore';
  syncUI();
  exploreUI();
}
function genWild(R) {
  const rar = R.rb >= 0.45 && Math.random() < 0.012 ? 5 : rollRarity(R.rb);
  let pool = COLORS.filter((c) => c.rar === rar && (!R.elem || c.elem === R.elem || c.elem === 'holy'));
  if (!pool.length || Math.random() < 0.2) pool = COLORS.filter((c) => c.rar === rar);
  const lv = Math.floor(rand(R.lv[0], R.lv[1] + 1));
  const st = lv >= 25 ? 2 : lv >= 10 ? 1 : 0;
  return { c: pick(pool).id, st, lv: Math.min(lv, LV_CAP[st]), star: 0, bond: 0 };
}
const capNeed = () => 60 + COLORS[X.wild.c].rar * 12;
const capTol = () => Math.max(6, 24 - COLORS[X.wild.c].rar * 3) * (1 + 0.3 * X.bait + (X.gold ? 0.6 : 0));
const capTarget = () => 70 * Math.max(0.7, S);
function exploreUI() {
  const R = REGIONS[X.ri];
  $('xRegion').textContent = `${R.icon} ${R.name}`;
  $('xStam').innerHTML = `⚡ <b>${stam()}</b>/${STAM_MAX}`;
  $('xCoins').innerHTML = `🔥 <b>${fmt(G.coins)}</b>`;
  $('xMsg').innerHTML = X.msg;
  const box = $('xBtns');
  box.innerHTML = '';
  const add = (label, fn, primary, disabled) => {
    const b = document.createElement('button');
    b.textContent = label; if (primary) b.className = 'primary'; b.disabled = !!disabled;
    b.onclick = fn; box.appendChild(b);
  };
  if (X.phase === 'idle') add('🔍 탐색하기 (⚡1)', exploreStep, true, stam() < 1);
  else if (X.phase === 'encounter') {
    add('🎯 포획 시도', startCapture, true);
    add(`🍖 먹이 던지기 (20🔥)${X.bait ? ` ×${X.bait}` : ''}`, throwBait, false, G.coins < 20 || X.bait >= 3);
    if (inv('bait') && !X.gold) add(`🍯 황금 먹이 (${inv('bait')})`, () => { addItem('bait', -1); X.gold = true; X.msg = '황금 먹이에 불사조가 마음을 연다! (판정 범위 +60%)'; SFX.eat(); save(); exploreUI(); });
    if (inv('charm') && !X.charm) add(`🧿 길들이기 부적 (${inv('charm')})`, () => { addItem('charm', -1); X.charm = true; X.msg = '부적이 빛난다! 포획 게이지가 40%에서 시작해요.'; SFX.good(); save(); exploreUI(); });
    add('🏃 도망치기', () => { X.phase = 'idle'; X.wild = null; X.msg = '조용히 자리를 떴다…'; exploreUI(); });
  }
  $('xBack').disabled = X.phase === 'capture' || X.phase === 'walk';
}
function exploreStep() {
  if (X.phase !== 'idle') return;
  if (stam() < 1) return toast('탐험 기력이 부족해요. 잠시 쉬거나 충전하세요 ⚡');
  G.stam--;
  X.phase = 'walk'; X.t = 0; X.msg = '수풀을 헤치며 탐색 중…';
  save();
  exploreUI();
}
function resolveExplore() {
  const R = REGIONS[X.ri];
  const r = Math.random();
  if (r < 0.68) {
    X.wild = genWild(R);
    X.phase = 'encounter'; X.appear = 0; X.bait = 0; X.gold = false; X.charm = false; X.gauge = 0; X.tries = 0;
    const C = COLORS[X.wild.c];
    X.msg = `야생 <b style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</b> <b>${esc(C.name)}</b> (${STAGE_NAMES[X.wild.st]} Lv.${X.wild.lv})이(가) 나타났다!${G.dex[C.id] ? '' : ' <b style="color:#ffd04a">미발견!</b>'}`;
    SFX.chirp(X.wild.st);
    if (C.rar >= 3) SFX.evolve();
  } else if (r < 0.88) {
    const n = Math.round(rand(15, 35) * (X.ri + 1));
    G.coins += n;
    X.phase = 'idle'; X.msg = `반짝이는 불씨 더미를 찾았다! 🔥 +${n}`;
    floatText(W / 2, H * 0.45, `🔥 +${n}`, '#ffd04a', 26);
    emit(W / 2, H * 0.5, 30, { smin: 60, smax: 220 });
    SFX.pick();
  } else if (r < 0.95) {
    const eid = R.rb >= 0.2 ? 'luck_egg' : 'egg';
    addItem(eid, 1);
    X.phase = 'idle'; X.msg = `${ITEM[eid].icon} ${ITEM[eid].name}을(를) 발견했다! 부화 탭에서 공짜로 부화할 수 있어요.`;
    toast(`${ITEM[eid].icon} ${ITEM[eid].name} 획득! → 부화 탭`, 2.2);
    SFX.good();
  } else {
    X.phase = 'idle'; X.msg = '아무것도 찾지 못했다…';
  }
  save();
  exploreUI();
  updateTop();
}
function throwBait() {
  if (X.phase !== 'encounter' || G.coins < 20 || X.bait >= 3) return;
  G.coins -= 20; X.bait++;
  X.msg = `먹이를 던졌다! 불사조가 조금 경계를 푼다. (포획 판정 범위 +${X.bait * 30}%)`;
  const c = wildCenter();
  emit(c[0], c[1], 14, { kind: 'heart', angle: -Math.PI / 2, spread: 0.6, smin: 40, smax: 90, rise: 0, lmin: 1, lmax: 1.5, rmin: 3, rmax: 4 });
  SFX.eat();
  save();
  exploreUI();
}
function startCapture() {
  X.phase = 'capture'; X.tries = 0; X.gauge = X.charm ? capNeed() * 0.4 : 0;
  X.ring = capTarget() * 3.2; X.wait = 0.5; X.judge = null;
  X.msg = '고리가 금빛 원에 겹칠 때 탭 / 스페이스! (3번의 기회)';
  exploreUI();
}
function judgeCapture(timeout) {
  if (!X || X.phase !== 'capture' || X.wait > 0) return;
  const d = Math.abs(X.ring - capTarget()), tol = capTol();
  const j = timeout ? 'MISS' : d < tol * 0.4 ? 'PERFECT' : d < tol ? 'GOOD' : 'MISS';
  X.judge = j; X.judgeT = 0.7;
  X.gauge += j === 'PERFECT' ? 55 : j === 'GOOD' ? 32 : 0;
  X.tries++;
  const [cx, cy] = wildCenter();
  if (j === 'PERFECT') { SFX.perfect(); emit(cx, cy, 30, { color: COLORS[X.wild.c].glow, smin: 80, smax: 240 }); }
  else if (j === 'GOOD') { SFX.good(); emit(cx, cy, 12, { color: COLORS[X.wild.c].glow }); }
  else SFX.miss();
  if (X.gauge >= capNeed()) return setTimeout(captureSuccess, 450);
  if (X.tries >= 3) return setTimeout(captureFail, 450);
  X.ring = capTarget() * 3.2; X.wait = 0.55;
}
function captureSuccess() {
  if (!X || X.phase !== 'capture') return;
  const w = X.wild, C = COLORS[w.c];
  const isNew = !G.dex[w.c];
  const p = addPhoenix({ c: w.c, st: w.st, lv: w.lv, bond: 10 });
  X.phase = 'idle'; X.wild = null;
  X.msg = `${esc(C.name)}을(를) 길들여 포획했다! 보관함에 들어갔어요.`;
  save();
  SFX.win();
  showModal('🎉 포획 성공!', `<div class="reveal" style="--glow: rgb(${C.glow})"><img src="${bigURL(p.c, p.st)}" alt=""></div>
    <p><b style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</b> ${esc(C.name)}${isNew ? ' <b style="color:#ffd04a">NEW!</b>' : ''}</p>
    <p>${ELEM[C.elem].i} ${STAGE_NAMES[p.st]} 불사조 · Lv.${p.lv} · 전투력 ${fmt(statsOf(p).power)}</p>`,
    [{ label: '바로 출전', fn: () => { if (setParty(p, true)) toast(`${nameOf(p)} 출전! (${party().length}/${PARTY_MAX})`); save(); exploreUI(); } }, { label: '계속 탐험', primary: true, fn: exploreUI }]);
  updateTop();
}
function captureFail() {
  if (!X || X.phase !== 'capture') return;
  const flee = Math.random() < 0.45 + COLORS[X.wild.c].rar * 0.1;
  if (flee) {
    const [cx, cy] = wildCenter();
    emit(cx, cy, 40, { color: COLORS[X.wild.c].glow, angle: -Math.PI / 2, spread: 0.8, smin: 120, smax: 380 });
    X.msg = `${esc(COLORS[X.wild.c].name)}이(가) 하늘로 날아가 버렸다…`;
    X.wild = null; X.phase = 'idle';
    SFX.lose();
  } else {
    X.phase = 'encounter';
    X.msg = '아슬아슬하게 빠져나갔다! 아직 도망치지 않았어요. 다시 시도해 보세요.';
  }
  exploreUI();
}
function wildCenter() {
  const h = Math.min(H * 0.5, W * 0.42) * [0.72, 1, 1.12][X.wild ? X.wild.st : 1];
  return [W * (W < 640 ? 0.55 : 0.62), H * 0.47, h];
}
function updateExplore(dt) {
  X.t += dt;
  if (X.judgeT > 0) X.judgeT -= dt;
  if (X.phase === 'walk') {
    X.walk += dt;
    if (Math.random() < dt * 10) emit(rand(0, W), H * 0.85, 1, { color: '160,130,110', angle: -Math.PI / 2, spread: 1, smin: 10, smax: 40, rise: 10, lmax: 0.8 });
    if (X.t > 1.4) resolveExplore();
  } else if (X.phase === 'capture') {
    if (X.wait > 0) X.wait -= dt;
    else {
      X.ring -= capTarget() * (1.7 + COLORS[X.wild.c].rar * 0.28 + X.tries * 0.15) * dt;
      if (X.ring < capTarget() - 30) judgeCapture(true);
    }
  }
  if (X.wild) X.appear = Math.min(1, X.appear + dt * 2.5);
}
function drawExplore() {
  const portrait = W / H < 1.15;
  const sc = (portrait ? Math.max(W / IMG_W, H * 0.9 / IMG_H) : Math.max(W / IMG_W, H / IMG_H)) * 1.12;
  const span = IMG_W * sc - W;
  const ox = -(Math.sin(X.walk * 0.55 + X.ri * 1.3) * 0.5 + 0.5) * span;
  const oy = Math.min(0, (H - IMG_H * sc) / 2) + (X.phase === 'walk' ? Math.abs(Math.sin(X.t * 7)) * 4 : 0);
  drawBG({ sc, ox, oy }, 0.15);
  ctx.fillStyle = REGIONS[X.ri].tint;
  ctx.fillRect(0, 0, W, H);
  drawAmbient();
  // companion
  const r = rep();
  if (r) {
    const img = colored(r.c, r.st, false);
    const hh = Math.min(H * 0.26, 190 * Math.max(0.7, S));
    const ww = (img.width / img.height) * hh;
    ctx.save();
    ctx.translate(16 + ww / 2, H - 160 - hh / 2 + (X.phase === 'walk' ? -Math.abs(Math.sin(X.t * 7)) * 8 : 0));
    if (FACING[r.st] === -1) ctx.scale(-1, 1);
    ctx.drawImage(img, -ww / 2, -hh / 2, ww, hh);
    ctx.restore();
  }
  if (X.phase === 'walk') {
    ctx.font = `700 ${22 * Math.max(0.8, S)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffeedd';
    ctx.fillText('탐색 중' + '.'.repeat(1 + Math.floor(X.t * 3) % 3), W / 2, H * 0.4);
  }
  if (X.wild) {
    const C = COLORS[X.wild.c];
    const [cx, cy, hh] = wildCenter();
    const img = colored(X.wild.c, X.wild.st, false);
    const a = X.appear;
    const k = (hh / img.height) * (0.6 + 0.4 * a);
    const ww = img.width * k, h2 = img.height * k;
    glow(cx, cy, hh * 0.75, C.glow, 0.45 * a);
    if (C.rar >= 3) glow(cx, cy, hh * (0.9 + 0.1 * Math.sin(T * 4)), C.rar === 3 ? '255,180,70' : C.rar === 4 ? '255,90,130' : '255,236,150', 0.3 * a);
    if (C.rar === 5) drawHalo(cx, cy, hh * 0.55, a);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(cx, cy + Math.sin(T * 2.5) * hh * 0.02);
    if (FACING[X.wild.st] === 1) ctx.scale(-1, 1);
    ctx.drawImage(img, -ww / 2, -h2 / 2, ww, h2);
    ctx.restore();
    if (Math.random() < 0.4) emit(cx + rand(-ww, ww) * 0.4, cy + rand(-h2, h2) * 0.4, 1, { color: C.glow, angle: -Math.PI / 2, spread: 0.5, smin: 10, smax: 40, rise: 40 });
    // name tag
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.max(14, 17 * S)}px sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    const tag = `${RARITY[C.rar]} · ${C.name} · Lv.${X.wild.lv}`;
    const ty = Math.max(70, cy - h2 / 2 - 8);
    ctx.strokeText(tag, cx, ty); ctx.fillStyle = RARITY_COL[C.rar]; ctx.fillText(tag, cx, ty);
    if (X.phase === 'capture') {
      const tr = capTarget(), tol = capTol();
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,120,0.25)';
      ctx.lineWidth = tol * 2;
      ctx.beginPath(); ctx.arc(cx, cy, tr, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,215,120,0.95)';
      ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(cx, cy, tr, 0, Math.PI * 2); ctx.stroke();
      if (X.wait <= 0) {
        ctx.lineWidth = 5; ctx.strokeStyle = `rgba(${C.glow},0.95)`;
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, X.ring), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      // capture gauge
      const bw = Math.min(260, W * 0.6), bx = cx - bw / 2, by = Math.min(H - 150, cy + h2 / 2 + 14);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
      ctx.fillStyle = '#ffd04a'; ctx.fillRect(bx, by, bw * Math.min(1, X.gauge / capNeed()), 10);
      ctx.font = '600 12px sans-serif'; ctx.fillStyle = '#ffeedd';
      ctx.fillText(`길들이기 ${Math.min(100, Math.round((X.gauge / capNeed()) * 100))}% · 남은 기회 ${3 - X.tries}`, cx, by + 28);
    }
    if (X.judge && X.judgeT > 0) {
      ctx.font = '800 30px sans-serif';
      ctx.fillStyle = { PERFECT: '#ffe066', GOOD: '#9fe0ff', MISS: '#ff7a7a' }[X.judge];
      ctx.globalAlpha = Math.min(1, X.judgeT * 3);
      ctx.fillText({ PERFECT: '완벽!', GOOD: '좋아!', MISS: '빗나감…' }[X.judge], cx, cy - capTarget() - 26);
      ctx.globalAlpha = 1;
    }
  }
  drawParts();
}

// ============================================================
// battle engine (AI)
// ============================================================
let B = null;
const ADV = { fire: 'wind', wind: 'water', water: 'fire' };
function elemMult(a, d) {
  if (a === 'divine') return d === 'divine' ? 1 : 1.35;
  if (d === 'divine') return 0.8;
  if (a === 'holy') return d === 'holy' ? 1 : 1.25;
  if (a === 'spirit') return d === 'spirit' ? 1.2 : d === 'holy' ? 0.85 : 1.1;
  if (d === 'holy') return 0.85;
  if (ADV[a] === d) return 1.5;
  if (ADV[d] === a) return 0.75;
  return 1;
}
const BATTLE_BONUS = 10000; // every finished battle pays this, win or lose
const DIFF = {
  easy: { name: '쉬움', mul: 0.5, count: 0.5, ai: 0.35 },
  normal: { name: '보통', mul: 0.7, count: 0.6, ai: 0.6 },
  hard: { name: '어려움', mul: 1.0, count: 0.8, ai: 1 },
};
const diff = () => DIFF[G.diff] || DIFF.normal;
const fancy = () => G.fx === 'fancy' && B && !B.many;
function enemyPlan(N, partyN) {
  const d = diff();
  const n = clamp(Math.round(Math.max(1, partyN) * d.count + N / 8), 1, Math.max(2, partyN + 1 + Math.floor(N / 15)));
  const lv = Math.max(1, Math.round(N * 0.8));
  return { n, lv };
}
function genEnemies(N, partyN) {
  const plan = enemyPlan(N, partyN);
  const list = [];
  for (let i = 0; i < plan.n; i++) {
    const lv = clamp(plan.lv + Math.floor(rand(-1, 1)), 1, 70);
    const st = lv >= 32 ? 2 : lv >= 16 ? 1 : 0;
    list.push({ c: randomColorOf(rollRarity(Math.min(0.35, N / 120))), st, lv: Math.min(lv, LV_CAP[st]), star: N > 60 ? Math.floor(rand(0, Math.min(3, N / 40))) : 0, bond: 0, uid: -i - 1 });
  }
  if (N % 5 === 0) {
    const lv = Math.min(70, plan.lv + 1), st = lv >= 32 ? 2 : lv >= 16 ? 1 : 0;
    list.unshift({ c: randomColorOf(N % 50 === 0 ? 5 : N % 25 === 0 ? 4 : Math.min(4, 3 + (Math.random() < N / 100 ? 1 : 0))), st, lv: Math.min(lv, LV_CAP[st]), star: Math.min(3, Math.floor(N / 30)), bond: 0, uid: -999, boss: true });
  }
  return list;
}
function mkUnit(p, side) {
  const s = statsOf(p);
  const boss = !!p.boss;
  const m = side === 1 ? diff().mul : 1;
  const hp = Math.round((boss ? s.hp * 1.8 : s.hp) * m);
  return { p, side, boss, hp, max: hp, atk: Math.round(s.atk * m), def: Math.round(s.def * m), spd: side === 1 ? s.spd * (0.85 + 0.15 * m) : s.spd, elem: COLORS[p.c].elem, glow: COLORS[p.c].glow,
    atb: Math.random() * 0.6, cd1: 1, revived: false, dead: false, fade: 1, lunge: 0, flash: 0, x: 0, y: 0, s: 50 };
}
function startBattle(N) {
  const pt = party();
  if (!pt.length) return toast('출전할 불사조를 먼저 고르세요');
  B = { N, t: 0, allies: pt.map((p) => mkUnit(p, 0)), foes: genEnemies(N, pt.length).map((p) => mkUnit(p, 1)), shots: [], gauge: [0, 0], over: false, aiUltDelay: rand(3, 6), storm: 0 };
  B.many = B.allies.length + B.foes.length > 30;
  B.buff = {};
  const used = [];
  for (const it of BATTLE_ITEMS) {
    if (G.useNext && G.useNext[it.id] && inv(it.id) > 0) { B.buff[it.id] = true; addItem(it.id, -1); used.push(it.icon); }
  }
  if (B.buff.atk) for (const u of B.allies) u.atk = Math.round(u.atk * 1.3);
  if (B.buff.def) for (const u of B.allies) u.def = Math.round(u.def * 1.3);
  if (B.buff.ult) B.gauge[0] = 100;
  if (used.length) setTimeout(() => toast(`아이템 사용: ${used.join(' ')}`, 1.6), 1600);
  save();
  mode = 'battle';
  closeModal();
  layoutBattle();
  $('bStage').textContent = `⚔️ 스테이지 ${N}${N % 5 === 0 ? ' 👹' : ''} · 아군 ${B.allies.length} vs 적 ${B.foes.length}`;
  $('bTactic').value = G.tactic;
  $('bSpeed').textContent = `▶ x${G.speed}`;
  $('bFx').textContent = G.fx === 'fancy' ? '✨ 화려' : '✨ 간단';
  syncUI();
  toast(`전투 시작! 적 ${B.foes.length}마리 (${diff().name})`, 1.5);
}
function fitGrid(n, aw, ah) {
  let best = { s: 0, c: 1, r: 1 };
  for (let c = 1; c <= n; c++) {
    const r = Math.ceil(n / c);
    const s = Math.min(aw / c, ah / r);
    if (s > best.s) best = { s, c, r };
  }
  return best;
}
function layoutBattle() {
  const top = 70, bottom = H - 80;
  for (const side of [0, 1]) {
    const units = side === 0 ? B.allies : B.foes;
    const aw = W * 0.44, ah = bottom - top;
    const g = fitGrid(units.length, aw, ah);
    const s = Math.min(g.s, 230 * Math.max(0.6, S));
    units.forEach((u, i) => {
      const col = i % g.c, row = Math.floor(i / g.c);
      const fromCenter = col * s + s / 2;
      const rowsUsed = Math.ceil(units.length / g.c);
      u.s = s * (u.boss ? 1.25 : 1);
      u.x = side === 0 ? W * 0.47 - fromCenter : W * 0.53 + fromCenter;
      u.y = top + (ah - rowsUsed * s) / 2 + row * s + s / 2 + (col % 2 ? s * 0.12 : 0);
    });
  }
}
const alive = (arr) => arr.filter((u) => !u.dead);
function chooseTarget(u, foes) {
  if (u.side === 1) {
    // AI: weighs type advantage, finishing blows and dangerous attackers (sloppier on lower difficulty)
    if (Math.random() > diff().ai) return pick(foes);
    let best = null, bs = -1e9;
    for (const f of foes) {
      const sc = elemMult(u.elem, f.elem) * 2 + (1 - f.hp / f.max) * 1.6 + (f.atk / u.atk) * 0.4 + (f.hp < u.atk * 1.2 ? 1.5 : 0) + Math.random() * 0.3;
      if (sc > bs) { bs = sc; best = f; }
    }
    return best;
  }
  if (G.tactic === 'weak') return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
  if (G.tactic === 'strong') return foes.reduce((a, b) => (b.atk > a.atk ? b : a));
  let best = null, bs = -1e9;
  for (const f of foes) {
    const sc = elemMult(u.elem, f.elem) * 3 - f.hp / f.max + Math.random() * 0.2;
    if (sc > bs) { bs = sc; best = f; }
  }
  return best;
}
function act(u) {
  const foes = alive(u.side === 0 ? B.foes : B.allies);
  if (!foes.length) return;
  u.cd1--;
  if (u.p.st >= 1 && u.cd1 <= 0 && foes.length >= 2) {
    u.cd1 = 3;
    u.lunge = 1;
    SFX.fire();
    const targets = foes.length > 12 ? foes.sort(() => Math.random() - 0.5).slice(0, 12) : foes;
    if (fancy()) {
      for (const f of targets) B.shots.push({ u, f, t: 0, dur: 0.45, mult: 0.55, kind: 'ball' });
      floatText(u.x, u.y - u.s * 0.55, '화염 날개', '#ffd04a', 15);
    } else {
      // simple mode: one visible flame, the other targets just flash when hit
      targets.forEach((f, i) => B.shots.push({ u, f, t: 0, dur: i ? 0.45 : 0.55, mult: 0.55, kind: i ? 'hidden' : 'breath' }));
    }
    return;
  }
  u.lunge = 1;
  if (!B.many || Math.random() < 0.15) SFX.breath();
  B.shots.push({ u, f: chooseTarget(u, foes), t: 0, dur: 0.55, mult: 1, kind: 'breath' });
}
function hitUnit(att, f, mult) {
  if (f.dead) {
    const others = alive(f.side === 0 ? B.allies : B.foes);
    if (!others.length) return;
    f = others[Math.floor(Math.random() * others.length)];
  }
  const em = elemMult(att.elem, f.elem);
  const crit = Math.random() < 0.1;
  const dmg = Math.max(1, Math.round(att.atk * mult * em * rand(0.9, 1.1) * (crit ? 1.6 : 1) * (60 / (60 + f.def))));
  dealDamage(f, dmg, att.side, em, crit);
}
function dealDamage(f, dmg, fromSide, em = 1, crit = false) {
  f.hp -= dmg;
  f.flash = 1;
  B.gauge[fromSide] = Math.min(100, B.gauge[fromSide] + (dmg / f.max) * 22);
  B.gauge[f.side] = Math.min(100, B.gauge[f.side] + (dmg / f.max) * (f.side === 1 ? 10 * diff().ai : 10));
  if (fromSide === 1) B.gauge[1] = Math.max(0, B.gauge[1] - (dmg / f.max) * 22 * (1 - diff().ai * 0.6));
  if (fancy() || (crit && !B.many)) floatText(f.x + rand(-8, 8), f.y - f.s * 0.35, (crit ? '치명! ' : '') + dmg + (em > 1.2 ? '↑' : em < 1 ? '↓' : ''), crit ? '#ffd04a' : em > 1.2 ? '#ff8a5a' : '#ffffff', crit ? 18 : 14);
  if (Math.random() < 0.3) SFX.hit();
  if (f.hp <= 0) {
    if (f.p.st === 2 && !f.revived) {
      f.revived = true;
      f.hp = Math.round(f.max * 0.35);
      emit(f.x, f.y, 40, { color: f.glow, smin: 80, smax: 260, rise: 40 });
      if (fancy() || (!B.many && Math.random() < 0.5)) floatText(f.x, f.y - f.s * 0.6, '🔥 부활!', '#ffb347', 18);
      SFX.heal();
    } else if (f.side === 0 && B.buff && B.buff.rev && !f.itemRev) {
      f.itemRev = true;
      f.hp = Math.round(f.max * 0.5);
      emit(f.x, f.y, 40, { color: '255,255,230', smin: 80, smax: 260, rise: 40 });
      if (!B.many || Math.random() < 0.3) floatText(f.x, f.y - f.s * 0.6, '🕊️ 부활!', '#ffffff', 18);
      SFX.heal();
    } else {
      f.hp = 0; f.dead = true;
      emit(f.x, f.y, 26, { color: '120,110,110', smin: 20, smax: 110, rise: 30, lmax: 1.5 });
    }
  }
}
function useUlt(side) {
  if (!B || B.over || B.gauge[side] < 100) return;
  B.gauge[side] = 0;
  B.storm = 1.2; B.stormSide = side;
  SFX.storm();
  const targets = alive(side === 0 ? B.foes : B.allies);
  const casters = alive(side === 0 ? B.allies : B.foes).sort(() => Math.random() - 0.5).slice(0, fancy() ? 24 : 3);
  if (targets.length) for (const c of casters) B.shots.push({ u: c, f: pick(targets), t: 0, dur: 0.7, mult: 0, kind: 'breath', visual: true });
  for (const f of targets) {
    dealDamage(f, Math.max(1, Math.round(f.max * (f.boss ? 0.1 : 0.24))), side);
    emit(f.x, f.y, fancy() ? 10 : 3, { smin: 60, smax: 200, rise: 50, color: '255,150,50' });
  }
  toast(side === 0 ? '🔥 피닉스 폭풍!' : '⚠️ 적의 피닉스 폭풍!', 1.4);
}
function updateBattle(rawDt) {
  if (B.over) return;
  const dt = rawDt * G.speed;
  B.t += dt;
  for (const u of B.allies.concat(B.foes)) {
    u.lunge = Math.max(0, u.lunge - dt * 4);
    u.flash = Math.max(0, u.flash - dt * 5);
    if (u.dead) { u.fade = Math.max(0, u.fade - dt * 1.5); continue; }
    u.atb += u.spd * 0.06 * dt;
    if (u.atb >= 1) { u.atb -= 1; act(u); }
  }
  for (const s of B.shots) {
    s.t += dt;
    const hitAt = s.kind === 'breath' ? s.dur * 0.55 : s.dur;
    if (s.t >= hitAt && !s.hit) {
      s.hit = true;
      if (!s.visual) hitUnit(s.u, s.f, s.mult);
      if (s.kind !== 'hidden' || fancy()) emit(s.f.x, s.f.y, fancy() ? 12 : 4, { color: s.u.glow, smin: 60, smax: 180, rise: 40, rmax: 3.5 });
    }
    if (s.kind === 'breath' && !s.hit && fancy()) {
      const [mx, my] = mouthPos(s.u);
      const q = Math.random() * Math.min(1, s.t / (s.dur * 0.55));
      emit(lerp(mx, s.f.x, q), lerp(my, s.f.y, q), 1, { color: s.u.glow, smin: 10, smax: 60, rise: 50, rmax: 3.5, lmax: 0.6 });
    }
    if (s.t >= s.dur) s.done = true;
  }
  B.shots = B.shots.filter((s) => !s.done);
  if (B.storm > 0) B.storm -= rawDt;
  // AI uses its ultimate when charged
  if (B.gauge[1] >= 100) { B.aiUltDelay -= dt; if (B.aiUltDelay <= 0) { useUlt(1); B.aiUltDelay = rand(2, 5); } }
  const ub = $('ultBtn');
  $('ultFill').style.width = B.gauge[0] + '%';
  ub.disabled = B.gauge[0] < 100;
  ub.classList.toggle('ready', B.gauge[0] >= 100);
  if (!alive(B.foes).length) endBattle(true);
  else if (!alive(B.allies).length) endBattle(false);
}
function drawUnit(u) {
  if (u.fade <= 0) return;
  const img = colored(u.p.c, u.p.st, u.s < 120);
  const box = u.s * 0.92;
  const k = Math.min(box / img.width, box / img.height);
  const w = img.width * k, h = img.height * k;
  const dir = u.side === 0 ? 1 : -1;
  const face = FACING[u.p.st];
  const flip = face !== 0 && face !== dir;
  const bob = Math.sin(T * 3 + u.x * 0.05) * u.s * 0.02;
  const x = u.x + dir * u.lunge * u.s * 0.25, y = u.y + bob;
  if (u.boss) glow(x, y, u.s * 0.8, '255,60,60', 0.35);
  if (!u.dead && COLORS[u.p.c].rar === 5) drawHalo(x, y, u.s * 0.46, u.fade);
  ctx.save();
  ctx.globalAlpha = u.fade;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  if (u.dead) ctx.globalAlpha = u.fade * 0.5;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (u.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = u.flash * 0.7;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
  if (u.dead) return;
  const bw = u.s * 0.7, bh = Math.max(3, u.s * 0.05);
  const bx = u.x - bw / 2, by = u.y + h / 2 + 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  const f = u.hp / u.max;
  ctx.fillStyle = f > 0.5 ? '#5ae07a' : f > 0.25 ? '#ffc040' : '#ff5050';
  ctx.fillRect(bx, by, bw * f, bh);
  if (u.s > 70) {
    ctx.font = `600 ${Math.max(10, u.s * 0.085)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = u.boss ? '#ff8080' : u.side === 0 ? '#ffe8c0' : '#ffc0c0';
    ctx.fillText(`${u.boss ? '👹 ' : ''}${ELEM[u.elem].i}Lv.${u.p.lv}`, u.x, by + bh + Math.max(11, u.s * 0.1));
  }
}
// mouth (beak) positions inside each stage's sprite, used for flame breath
const MOUTH = [[150, 84], [250, 142], [190, 160]];
function mouthPos(u) {
  const m = A[STAGE_KEYS[u.p.st]];
  const box = u.s * 0.92;
  const k = Math.min(box / m.w, box / m.h);
  const dir = u.side === 0 ? 1 : -1;
  const face = FACING[u.p.st];
  const flip = face !== 0 && face !== dir;
  let lx = (MOUTH[u.p.st][0] - m.w / 2) * k;
  const ly = (MOUTH[u.p.st][1] - m.h / 2) * k;
  if (flip) lx = -lx;
  const bob = Math.sin(T * 3 + u.x * 0.05) * u.s * 0.02;
  return [u.x + dir * u.lunge * u.s * 0.25 + lx, u.y + bob + ly];
}
function drawBreath(s) {
  const [mx, my] = mouthPos(s.u);
  const reach = s.dur * 0.55;
  const f = Math.min(1, s.t / reach);
  const fade = s.t <= reach ? 1 : clamp(1 - (s.t - reach) / (s.dur - reach), 0, 1);
  const tx = s.f.x + (s.f.side === 0 ? 1 : -1) * 0, ty = s.f.y;
  const ex = lerp(mx, tx, f), ey = lerp(my, ty, f);
  const len = Math.hypot(ex - mx, ey - my);
  if (len < 2) return;
  const ang = Math.atan2(ey - my, ex - mx);
  const w0 = Math.max(2.5, s.u.s * 0.025);
  const w1 = Math.max(7, s.u.s * (fancy() ? 0.17 : 0.1)) * (0.88 + 0.12 * Math.sin(T * 40 + s.u.x));
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = fade;
  const g = ctx.createLinearGradient(0, 0, len + w1, 0);
  g.addColorStop(0, 'rgba(255,255,235,1)');
  g.addColorStop(0.2, `rgba(${s.u.glow},0.95)`);
  g.addColorStop(0.75, `rgba(${s.u.glow},0.6)`);
  g.addColorStop(1, `rgba(${s.u.glow},0)`);
  ctx.fillStyle = g;
  const N = fancy() ? 9 : 4;
  ctx.beginPath();
  ctx.moveTo(0, -w0);
  for (let i = 1; i <= N; i++) { const q = i / N; ctx.lineTo(len * q, -lerp(w0, w1, Math.sqrt(q)) + Math.sin(T * 31 + i * 1.7) * w1 * 0.22); }
  ctx.quadraticCurveTo(len + w1 * 0.9, 0, len, lerp(w0, w1, 1));
  for (let i = N; i >= 1; i--) { const q = i / N; ctx.lineTo(len * q, lerp(w0, w1, Math.sqrt(q)) + Math.sin(T * 27 + i * 2.3) * w1 * 0.22); }
  ctx.lineTo(0, w0);
  ctx.closePath();
  ctx.fill();
  // white-hot core
  ctx.fillStyle = 'rgba(255,250,225,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -w0 * 0.6);
  ctx.quadraticCurveTo(len * 0.5, -w1 * 0.28, len * 0.92, 0);
  ctx.quadraticCurveTo(len * 0.5, w1 * 0.28, 0, w0 * 0.6);
  ctx.fill();
  ctx.restore();
  glow(mx, my, w1 * 1.3, s.u.glow, 0.7 * fade);
  if (f >= 1) glow(ex, ey, w1 * 2.2, s.u.glow, 0.6 * fade);
}
function drawBattle() {
  const t = homeT();
  drawBG(t, 0.5);
  if (B.storm > 0) {
    ctx.fillStyle = `rgba(255,120,30,${B.storm * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
  for (const u of B.allies) drawUnit(u);
  for (const u of B.foes) drawUnit(u);
  for (const s of B.shots) {
    if (s.kind === 'hidden') continue;
    if (s.kind === 'breath') { drawBreath(s); continue; }
    const f = Math.min(1, s.t / s.dur);
    const [mx, my] = mouthPos(s.u);
    const x = lerp(mx, s.f.x, f), y = lerp(my, s.f.y, f) - Math.sin(f * Math.PI) * 40 * S;
    const r = 7 * Math.max(0.6, Math.min(1.4, s.u.s / 120));
    // comet tail
    for (let k = 1; k <= 3; k++) {
      const f2 = Math.max(0, f - k * 0.06);
      glow(lerp(mx, s.f.x, f2), lerp(my, s.f.y, f2) - Math.sin(f2 * Math.PI) * 40 * S, r * (3 - k * 0.6), s.u.glow, 0.35);
    }
    glow(x, y, r * 3, s.u.glow, 0.8);
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  drawParts();
  // enemy ult gauge
  ctx.font = '600 13px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffc0c0';
  ctx.fillText(`적 폭풍 게이지 ${Math.floor(B.gauge[1])}%`, W - 12, H - 22);
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffe8c0';
  ctx.fillText(`아군 ${alive(B.allies).length}/${B.allies.length}  ·  적 ${alive(B.foes).length}/${B.foes.length}`, 12, H - 22);
}
function endBattle(win) {
  B.over = true;
  const N = B.N;
  const foeExp = B.foes.reduce((a, u) => a + 10 + u.p.lv * 6 * (u.boss ? 3 : 1), 0);
  const each = Math.round((win ? 1.5 : 0.5) * foeExp / Math.sqrt(B.allies.length));
  let coins = BATTLE_BONUS + (win ? 25 + N * 10 + (N % 5 === 0 ? 120 + N * 5 : 0) : 10 + N);
  const bossEgg = win && N % 5 === 0;
  if (bossEgg) addItem('luck_egg', 1);
  let ups = 0, capped = 0;
  for (const u of B.allies) {
    ups += addExp(u.p, each) ? 1 : 0;
    if (u.p.st < 2 && u.p.lv >= LV_CAP[u.p.st]) capped++;
    u.p.bond = clamp(u.p.bond + (win ? 1 : 0.3), 0, 100);
  }
  G.coins += coins;
  let capture = null;
  if (win) {
    if (N >= G.best) G.best = N + 1;
    G.stage = N + 1;
    const boss = B.foes.find((u) => u.boss);
    if (boss || Math.random() < 0.35) {
      const src = boss || pick(B.foes);
      const st = src.p.st;
      const isNew = !G.dex[src.p.c];
      capture = { p: addPhoenix({ c: src.p.c, st, lv: Math.max(1, Math.min(LV_CAP[st], src.p.lv - 2)), party: false }), isNew };
    }
    SFX.win();
  } else SFX.lose();
  save();
  let html = `<p>${win ? '🎉 AI 불사조 군단을 물리쳤어요!' : '아군이 모두 쓰러졌어요. 불사조는 잿더미에서 다시 일어납니다.'}</p>
    <p>불씨 +${fmt(coins)} (전투 보상 ${fmt(BATTLE_BONUS)} 포함) · 출전 불사조 각각 경험치 +${each}${ups ? ` · 레벨 업 ${ups}마리` : ''}</p>${bossEgg ? '<p style="color:#ffd04a">🥚 보스 보상: 행운의 알 1개 → 부화 탭에서 공짜로 부화하세요!</p>' : ''}`;
  if (capped) html += `<p style="color:#ffd04a">✨ 레벨 상한에 도달한 불사조 ${capped}마리 — 불씨로 진화시키면 더 강해져요! (보관함)</p>`;
  if (capture) {
    const C = COLORS[capture.p.c];
    html += `<div class="reveal" style="--glow: rgb(${C.glow})"><img src="${thumbURL(capture.p.c, capture.p.st)}" alt="" style="height:120px"></div>
      <p>야생 불사조 포획! <b style="color:${RARITY_COL[C.rar]}">${RARITY[C.rar]}</b> ${esc(C.name)} (${STAGE_NAMES[capture.p.st]} Lv.${capture.p.lv})${capture.isNew ? ' <b style="color:#ffd04a">NEW!</b>' : ''}</p>`;
  }
  const back = () => { B = null; mode = 'home'; parts = []; goTab('battle'); };
  const btns = [{ label: '전투 메뉴로', fn: back }];
  if (win) btns.push({ label: `다음 스테이지 (${N + 1}) ▶`, primary: true, fn: () => startBattle(N + 1) });
  else btns.push({ label: '다시 도전', primary: true, fn: () => startBattle(N) });
  setTimeout(() => {
    showModal(win ? `스테이지 ${N} 승리!` : `스테이지 ${N} 패배`, html, btns);
    if (win && G.autoNext) setTimeout(() => { if (modalOpen && B && B.over && B.N === N) startBattle(N + 1); }, 2200);
  }, 700);
}

// ============================================================
// main loop
// ============================================================
let last = performance.now();
let saveT = 5, hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  T += dt;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (bubble) { bubble.t -= dt; if (bubble.t <= 0) bubble = null; }
  for (const k in homeAnim) homeAnim[k] = Math.max(0, homeAnim[k] - dt);
  updateParts(dt);
  updateAmbient(dt);
  if (G && !modalOpen) {
    if (mode === 'rhythm') updateRhythm(dt);
    else if (mode === 'catch') updateCatch(dt);
    else if (mode === 'battle') updateBattle(dt);
    else if (mode === 'explore') updateExplore(dt);
    if (mode === 'home') {
      updateEvo(dt);
      chatterT -= dt;
      if (chatterT <= 0 && tab === 'home') { chatterT = rand(7, 13); say(pick(CRY[rep().st]), 1.4); }
    }
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (mode === 'catch' && ca) drawCatch();
  else if (mode === 'explore' && X) drawExplore();
  else if (mode === 'battle' && B) drawBattle();
  else drawHome();
  if (G) {
    hudT -= dt;
    if (hudT <= 0 && mode !== 'battle') { hudT = 0.25; updateTop(); }
    saveT -= dt;
    if (saveT <= 0) { saveT = 5; save(); }
  }
  requestAnimationFrame(frame);
}

// ============================================================
// input
// ============================================================
cv.addEventListener('pointerdown', (e) => {
  if (!G || modalOpen) return;
  const x = e.clientX, y = e.clientY;
  if (mode === 'rhythm') return judgeRing(false);
  if (mode === 'catch') { ca.tx = x; return; }
  if (mode === 'explore') { if (X && X.phase === 'capture') judgeCapture(false); return; }
  if (mode !== 'home' || tab !== 'home' || evo) return;
  const t = homeT();
  for (const s of [2, 1, 0]) {
    const R = slotRect(s, t);
    if (x > R.x + R.w * 0.2 && x < R.x + R.w * 0.8 && y > R.y + R.h * 0.15 && y < R.y + R.h * 0.95) {
      const occ = slotOccupant(s);
      if (!occ) return toast(`${STAGE_NAMES[s]} 불사조가 아직 없어요. 진화·전투 포획으로 얻어 보세요`);
      if (occ.uid === G.rep) return actPet();
      G.rep = occ.uid; save(); updateTop();
      toast(`${nameOf(occ)}을(를) 대표로 바꿨어요`);
      return;
    }
  }
});
cv.addEventListener('pointermove', (e) => { if (mode === 'catch' && ca && (e.pointerType === 'mouse' || e.buttons)) ca.tx = e.clientX; });
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (mode === 'rhythm' && !modalOpen) judgeRing(false);
    else if (mode === 'battle') useUlt(0);
    else if (mode === 'explore' && X && X.phase === 'capture') judgeCapture(false);
  }
  if (mode === 'catch' && ca) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') ca.kv = -1;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') ca.kv = 1;
  }
});
window.addEventListener('keyup', (e) => { if (mode === 'catch' && ca && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) ca.kv = 0; });
window.addEventListener('resize', resize);

$('aPet').onclick = actPet;
$('aFeed').onclick = actFeed;
$('aBond').onclick = startBond;
$('aCatch').onclick = startCatch;
$('aEvolve').onclick = () => actEvolve();
$('mute').onclick = () => { G.muted = !G.muted; save(); updateTop(); };
for (const b of document.querySelectorAll('#nav button')) b.onclick = () => goTab(b.dataset.tab);
$('bSpeed').onclick = () => { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : 1; $('bSpeed').textContent = `▶ x${G.speed}`; save(); };
$('bTactic').onchange = (e) => { G.tactic = e.target.value; save(); };
$('bFx').onclick = () => { G.fx = G.fx === 'fancy' ? 'simple' : 'fancy'; $('bFx').textContent = G.fx === 'fancy' ? '✨ 화려' : '✨ 간단'; save(); };
$('ultBtn').onclick = () => useUlt(0);
$('xBack').onclick = () => { X = null; mode = 'home'; parts = []; goTab('explore'); };
$('bRetreat').onclick = () => {
  showModal('후퇴할까요?', '<p>전투를 포기하고 돌아갑니다. 보상은 없어요.</p>', [
    { label: '계속 싸우기' },
    { label: '후퇴', primary: true, fn: () => { B = null; mode = 'home'; parts = []; goTab('battle'); } },
  ]);
};

function begin() {
  mode = 'home';
  tab = 'home';
  $('title').classList.add('hidden');
  cam.ox = null;
  syncUI();
  say(pick(CRY[rep().st]));
  save();
}
function startNew() {
  newGame();
  begin();
  toast('알에서 깨어난 호박 불사조! 쓰다듬고 먹이를 줘 보세요', 3);
}
$('btnNew').onclick = () => {
  if (!load()) return startNew();
  $('title').classList.add('hidden');
  showModal('새로 시작할까요?', '<p>저장된 진행이 모두 사라져요.</p>', [
    { label: '취소', fn: () => $('title').classList.remove('hidden') },
    { label: '새로 시작', primary: true, fn: startNew },
  ]);
};

(async function init() {
  resize();
  await Promise.all(['bg', ...STAGE_KEYS].map(async (k) => { IM[k] = await loadImg(A[k].src); }));
  SRC = STAGE_KEYS.map((k) => toCanvas(IM[k], 1));
  THUMB = STAGE_KEYS.map((k) => toCanvas(IM[k], 130 / Math.max(A[k].w, A[k].h)));
  const saved = load();
  if (saved) {
    $('btnContinue').classList.remove('hidden');
    $('btnContinue').onclick = () => {
      G = Object.assign({ dexClaim: 0 }, saved);
      while (G.dex.length < NCOL) G.dex.push(0);
      trimParty();
      begin();
    };
  }
  requestAnimationFrame(frame);
})();
})();
