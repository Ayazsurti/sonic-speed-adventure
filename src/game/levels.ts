import type { Level, Seg, Theme } from './types';

export const THEMES: Theme[] = [
  { name: 'Green Hill Dash', skyTop: '#2f8bff', skyBot: '#c4ebff', far: '#6fd0a8', near: '#3aae5c', grass: '#46d65f', grassDark: '#1f8f3d', dirtA: '#b9742f', dirtB: '#9a5a22', plats: ['#ff8a3d', '#ffd23d', '#4dd0e1', '#ff5d8f'], stars: false, sun: '#fff3a8', cloud: 'rgba(255,255,255,.9)' },
  { name: 'Sunset Canyon', skyTop: '#ff6f45', skyBot: '#ffdca3', far: '#d98270', near: '#b9593f', grass: '#ffb347', grassDark: '#c46a1c', dirtA: '#a8482c', dirtB: '#8a3a22', plats: ['#7e57c2', '#26a69a', '#ffca28', '#ef5350'], stars: false, sun: '#fff0c0', cloud: 'rgba(255,240,225,.85)' },
  { name: 'Neon Night Zone', skyTop: '#0a0e2e', skyBot: '#3d2b80', far: '#2b2f80', near: '#1f6a8a', grass: '#35f0c8', grassDark: '#12907c', dirtA: '#3d3170', dirtB: '#2d2459', plats: ['#ff4fd8', '#4fd6ff', '#ffe34f', '#7dff6b'], stars: true, sun: '#e6f0ff', cloud: 'rgba(160,140,255,.35)' },
];

export const LEVEL_COUNT = THEMES.length;
const CFG = [
  { seed: 11, sections: 12, d: 0, par: 75 },
  { seed: 42, sections: 16, d: 1, par: 95 },
  { seed: 77, sections: 20, d: 2, par: 120 },
];

export const smooth = (t: number) => t * t * (3 - 2 * t);
export function segY(s: Seg, x: number): number {
  const t = (x - s.x0) / (s.x1 - s.x0);
  return s.y0 + (s.y1 - s.y0) * smooth(Math.min(1, Math.max(0, t)));
}

/** Ground height at x, or null if there is a gap / no ground. */
export function groundAt(L: Level, x: number): number | null {
  const a = L.segs;
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const s = a[m];
    if (x < s.x0) hi = m - 1;
    else if (x > s.x1) lo = m + 1;
    else return s.gap ? null : segY(s, x);
  }
  return null;
}

export function slopeAt(L: Level, x: number): number {
  const a = groundAt(L, x - 5), b = groundAt(L, x + 5);
  return a === null || b === null ? 0 : (b - a) / 10;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLevel(i: number): Level {
  const c = CFG[i];
  const r = rng(c.seed);
  const d = c.d;
  const L: Level = { theme: THEMES[i], segs: [], rings: [], plats: [], springs: [], spikes: [], enemies: [], checkpoints: [], finishX: 0, bottom: 0, par: c.par };
  let x = 0, y = 520;
  const flat = (n: number) => { L.segs.push({ x0: x, x1: x + n, y0: y, y1: y }); x += n; };
  const hill = (n: number, dy: number) => { L.segs.push({ x0: x, x1: x + n, y0: y, y1: y + dy }); x += n; y += dy; };
  const gap = (n: number) => { L.segs.push({ x0: x, x1: x + n, y0: y, y1: y, gap: true }); x += n; };
  const gy = (px: number) => groundAt(L, px) ?? y;
  const ring = (px: number, py: number) => { L.rings.push({ x: px, y: py, got: false, ph: r() * 6 }); };
  const line = (px: number, n: number, sp: number, up: number) => { for (let k = 0; k < n; k++) ring(px + k * sp, gy(px + k * sp) - up); };
  const arc = (cx: number, n: number, w: number, h: number, base: number) => {
    for (let k = 0; k < n; k++) { const t = n > 1 ? k / (n - 1) : 0.5; ring(cx + (t - 0.5) * w, base - 30 - Math.sin(t * Math.PI) * h); }
  };
  const enemy = (ex: number, flyer: boolean) => {
    const base = flyer ? gy(ex) - 85 - r() * 30 : gy(ex);
    L.enemies.push({ kind: flyer ? 'flyer' : 'crawler', x: ex, y: base, x0: ex - 80, x1: ex + 80, dir: r() < 0.5 ? -1 : 1, speed: 1 + d * 0.25 + r() * 0.3, base, alive: true, t: r() * 100 });
  };

  flat(700);
  const pool = ['run', 'hill', 'gap', 'plat', 'enemy', 'spring', 'hill', 'run'];
  if (d >= 1) pool.push('spike', 'enemy', 'gap');
  if (d >= 2) pool.push('spike', 'plat', 'enemy');

  for (let s = 0; s < c.sections; s++) {
    if (s > 0 && s % 5 === 0) { flat(160); L.checkpoints.push({ x: x - 80, active: false }); }
    const kind = pool[Math.floor(r() * pool.length)];
    if (kind === 'run') {
      const x0 = x; flat(500 + r() * 300); line(x0 + 60, 8, 50, 30);
      if (d >= 1 && r() < 0.5) enemy(x0 + 250 + r() * 150, d >= 2 && r() < 0.4);
    } else if (kind === 'hill') {
      const dir = y > 570 ? -1 : y < 450 ? 1 : r() < 0.5 ? -1 : 1;
      const dy = dir * (60 + r() * 70), n = Math.abs(dy) * 4.6, x0 = x;
      hill(n, dy); line(x0 + 40, Math.floor(n / 70), 70, 34); flat(260 + r() * 100);
      if (d >= 1 && r() < 0.5) enemy(x - 150, false);
    } else if (kind === 'gap') {
      flat(240);
      const gl = 150 + d * 40 + r() * 60 + (d >= 1 && r() < 0.5 ? 130 : 0), gx = x;
      gap(gl);
      if (gl > 270) L.plats.push({ x: gx + gl / 2 - 45, y: y - 40, w: 90, c: s });
      arc(gx + gl / 2, 6, gl + 80, 90, y); flat(260);
    } else if (kind === 'plat') {
      const n = 3 + (d > 0 ? 1 : 0);
      flat(200);
      const px0 = x, base = y;
      flat(n * 170 + 260);
      for (let k = 0; k < n; k++) {
        const py = base - 100 - (k % 2) * 55, pxk = px0 + 60 + k * 170;
        L.plats.push({ x: pxk, y: py, w: 110, c: k + s });
        ring(pxk + 55, py - 34);
        if (d >= 1 && k < n - 1 && r() < 0.7) L.spikes.push({ x: pxk + 120, y: base, w: 60 });
      }
    } else if (kind === 'enemy') {
      const len = 600 + r() * 200, x0 = x;
      flat(len);
      const n = 1 + d + (r() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) enemy(x0 + 160 + k * 150 + r() * 40, (d >= 1 && r() < 0.35) || (d === 0 && r() < 0.2));
      line(x0 + 40, 6, 60, 30);
    } else if (kind === 'spike') {
      const x0 = x; flat(560);
      const sw = 60 + Math.floor(r() * 2) * 20 + d * 20;
      L.spikes.push({ x: x0 + 240, y, w: sw });
      arc(x0 + 240 + sw / 2, 5, sw + 120, 80, y);
    } else {
      const x0 = x; flat(1000);
      L.springs.push({ x: x0 + 120, y, t: 0 });
      const pxx = x0 + 450;
      L.plats.push({ x: pxx, y: y - 190, w: 260, c: 1 });
      for (let k = 0; k < 5; k++) ring(pxx + 30 + k * 50, y - 224);
      if (d >= 1 && r() < 0.5) enemy(x0 + 800, false);
    }
  }
  flat(500);
  L.finishX = x - 300;
  L.bottom = Math.max(...L.segs.map((s) => Math.max(s.y0, s.y1))) + 420;
  return L;
}
