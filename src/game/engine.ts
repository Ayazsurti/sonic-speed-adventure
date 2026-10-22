import type { Level, Plat } from './types';
import { buildLevel, groundAt, slopeAt, LEVEL_COUNT } from './levels';
import { Input } from './input';
import { sfx } from './audio';
import { draw } from './render';
import { loadBest, saveBest, markCleared } from './storage';

export interface HudState { score: number; rings: number; lives: number; level: number; time: number; best: number }
export type Status = 'running' | 'paused' | 'gameover' | 'complete' | 'win';
export interface EndInfo { score: number; best: number; newBest: boolean; timeBonus: number; ringBonus: number; time: number; lives: number }
export interface Callbacks { onHud: (h: HudState) => void; onStatus: (s: Status, e?: EndInfo) => void }

export interface Player {
  x: number; y: number; prevY: number; vx: number; vy: number;
  grounded: boolean; plat: Plat | null; face: 1 | -1;
  rolling: boolean; crouch: boolean; ball: boolean; springed: boolean;
  inv: number; hurt: number; coyote: number; buffer: number; win: boolean; anim: number;
}
export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  size: number; color: string; kind: 'dot' | 'ring' | 'line'; grav: number;
}

const STEP = 1000 / 60, MAXRUN = 9.5, GRAV = 0.5, JUMP = 12.4;
const approach = (v: number, t: number, a: number) => (v < t ? Math.min(v + a, t) : Math.max(v - a, t));

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  level!: Level;
  p!: Player;
  cam = { x: 0, y: 0 };
  vw = 960; vh = 540; scale = 1; dpr = 1;
  parts: Particle[] = [];
  input: Input;
  status: Status = 'running';
  frame = 0; tick = 0;
  score: number; lives: number; rings = 0; best: number;
  respawnX = 120;
  finishing = false; winTimer = 0;
  private endInfo?: EndInfo;
  private raf = 0; private last = 0; private acc = 0; private disposed = false;
  private startScore: number;

  constructor(canvas: HTMLCanvasElement, readonly idx: number, score: number, lives: number, private cb: Callbacks) {
    this.canvas = canvas;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas 2D is not supported');
    this.ctx = c;
    this.score = score; this.startScore = score; this.lives = lives; this.best = loadBest();
    this.input = new Input(() => this.togglePause());
    this.load();
    this.resize();
    this.cameraStep(true);
  }

  private load() {
    this.level = buildLevel(this.idx);
    this.p = {
      x: 120, y: groundAt(this.level, 120) ?? 520, prevY: 520, vx: 0, vy: 0, grounded: true, plat: null, face: 1,
      rolling: false, crouch: false, ball: false, springed: false, inv: 0, hurt: 0, coyote: 0, buffer: 0, win: false, anim: 0,
    };
    this.rings = 0; this.tick = 0; this.finishing = false; this.winTimer = 0; this.parts = []; this.respawnX = 120;
    this.endInfo = undefined;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.scale = Math.max(0.35, Math.min(h / 540, w / 720));
    this.vw = w / this.scale; this.vh = h / this.scale;
  }

  start() {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emitHud();
    this.cb.onStatus('running');
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.dispose();
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(100, now - this.last);
    this.last = now;
    if (this.status !== 'paused') {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) { this.update(); this.acc -= STEP; n++; }
      if (n === 5) this.acc = 0;
    }
    draw(this.ctx, this);
  };

  pause() {
    if (this.status === 'running' && !this.finishing) { this.status = 'paused'; this.input.clear(); this.cb.onStatus('paused'); }
  }
  resume() {
    if (this.status === 'paused') { this.status = 'running'; this.last = performance.now(); this.acc = 0; this.input.clear(); this.cb.onStatus('running'); }
  }
  togglePause() { if (this.status === 'paused') this.resume(); else this.pause(); }

  restart() {
    this.score = this.startScore; this.lives = 3; this.best = loadBest();
    this.load(); this.cameraStep(true);
    this.status = 'running'; this.last = performance.now(); this.acc = 0; this.input.clear();
    this.emitHud(); this.cb.onStatus('running');
  }

  private emitHud() {
    this.cb.onHud({ score: this.score, rings: this.rings, lives: this.lives, level: this.idx + 1, time: this.tick / 60, best: Math.max(this.best, this.score) });
  }

  update() {
    this.frame++;
    if (this.finishing) {
      this.winTimer++;
      this.stepPlayer();
      if (this.winTimer === 90) {
        this.status = this.idx >= LEVEL_COUNT - 1 ? 'win' : 'complete';
        this.cb.onStatus(this.status, this.endInfo);
      }
    } else if (this.status === 'running') {
      this.tick++;
      this.stepPlayer();
      this.stepWorld();
    }
    this.stepParticles();
    this.cameraStep();
    if (this.frame % 6 === 0) this.emitHud();
  }

  private spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, kind: Particle['kind'] = 'dot', grav = 0.15) {
    if (this.parts.length > 260) return;
    this.parts.push({ x, y, vx, vy, life, max: life, size, color, kind, grav });
  }
  private burst(x: number, y: number, n: number, color: string, sp = 4, kind: Particle['kind'] = 'dot') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * sp;
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 1, 24 + Math.random() * 16, 2 + Math.random() * 3, color, kind, 0.18);
    }
  }

  private stepPlayer() {
    const p = this.p, inp = this.input, L = this.level;
    p.anim++;
    if (inp.consumeJump()) p.buffer = 7;
    if (p.inv > 0) p.inv--;
    if (p.hurt > 0) p.hurt--;
    const ctrl = p.hurt <= 0 && !p.win;
    const D = ctrl ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
    const down = ctrl && inp.down;

    if (p.grounded) {
      p.coyote = 6;
      const sl = p.plat ? 0 : slopeAt(L, p.x), sn = sl / Math.sqrt(1 + sl * sl), sp = Math.abs(p.vx);
      if (down && sp > 1.5) p.rolling = true;
      if (p.rolling && sp < 0.7) p.rolling = false;
      p.crouch = down && !p.rolling;
      if (p.rolling) {
        p.vx += sn * 0.55; p.vx = approach(p.vx, 0, 0.035);
        if (D && D * p.vx < 0) p.vx += D * 0.14;
      } else if (p.crouch) {
        p.vx = approach(p.vx, 0, 0.35);
      } else {
        if (D) {
          if (p.vx * D < 0) p.vx += D * 0.6;
          else if (sp < MAXRUN) p.vx = Math.max(-MAXRUN, Math.min(MAXRUN, p.vx + D * 0.17));
          else p.vx = approach(p.vx, D * MAXRUN, 0.03);
        } else p.vx = approach(p.vx, 0, 0.16);
        p.vx += sn * 0.38;
      }
      if (Math.abs(p.vx) > 18) p.vx = Math.sign(p.vx) * 18;
      if (D && !p.rolling) p.face = D > 0 ? 1 : -1;
      else if (Math.abs(p.vx) > 1) p.face = p.vx > 0 ? 1 : -1;
      if (p.win && Math.abs(p.vx) < 0.6 && this.winTimer % 40 === 5) { p.vy = -9; p.grounded = false; p.plat = null; sfx.play('spring'); }
    } else {
      if (p.coyote > 0) p.coyote--;
      if (D) { if (Math.abs(p.vx) < MAXRUN || p.vx * D < 0) p.vx += D * 0.15; p.face = D > 0 ? 1 : -1; }
      p.vy = Math.min(p.vy + GRAV, 15);
      if (p.ball && !p.springed && !inp.jump && p.vy < -4.5) p.vy = -4.5;
    }

    if (p.buffer > 0) {
      p.buffer--;
      if (p.coyote > 0 && ctrl) {
        p.vy = -JUMP; p.grounded = false; p.plat = null; p.ball = true; p.rolling = false; p.crouch = false;
        p.springed = false; p.coyote = 0; p.buffer = 0; sfx.play('jump');
      }
    }

    const ox = p.x;
    p.prevY = p.y;
    p.x += p.vx;
    const endX = L.segs[L.segs.length - 1].x1 - 30;
    if (p.x < 24) { p.x = 24; p.vx = Math.max(0, p.vx); }
    if (p.x > endX) { p.x = endX; p.vx = Math.min(0, p.vx); }

    if (p.grounded) {
      let sy: number | null;
      if (p.plat) {
        const pl = p.plat;
        if (p.x >= pl.x - 6 && p.x <= pl.x + pl.w + 6) sy = pl.y;
        else { p.plat = null; sy = groundAt(L, p.x); }
      } else sy = groundAt(L, p.x);
      if (sy !== null && sy - p.y <= 14) { p.y = sy; p.vy = 0; }
      else { p.grounded = false; p.plat = null; p.ball = false; p.rolling = false; }
    } else {
      p.y += p.vy;
      let gy = groundAt(L, p.x);
      if (gy !== null && p.prevY > gy + 16) { p.x = ox; p.vx = 0; gy = groundAt(L, p.x); }
      if (p.vy >= 0) {
        let sy: number | null = null, plat: Plat | null = null;
        if (gy !== null && p.y >= gy && p.prevY <= gy + 16) sy = gy;
        for (const pl of L.plats) {
          if (Math.abs(pl.x + pl.w / 2 - p.x) < pl.w / 2 + 6 && p.prevY <= pl.y + 2 && p.y >= pl.y && (sy === null || pl.y < sy)) { sy = pl.y; plat = pl; }
        }
        if (sy !== null) {
          p.y = sy; p.vy = 0; p.grounded = true; p.plat = plat; p.ball = false; p.springed = false;
          for (let i = 0; i < 5; i++) this.spawn(p.x + (Math.random() - 0.5) * 16, p.y - 2, (Math.random() - 0.5) * 3, -Math.random() * 1.5, 16, 3, 'rgba(255,255,255,.7)', 'dot', 0.05);
        }
      }
    }

    if (p.grounded && Math.abs(p.vx) > 6 && this.frame % 4 === 0) this.spawn(p.x - p.face * 8, p.y - 2, -p.vx * 0.1, -0.5, 18, 3.5, 'rgba(255,255,255,.65)', 'dot', 0.02);
    if (Math.abs(p.vx) > 8.8 && this.frame % 2 === 0) this.spawn(p.x - Math.sign(p.vx) * 22, p.y - 6 - Math.random() * 36, -p.vx * 0.35, 0, 10, 1, '#fff', 'line', 0);
    if (p.y > L.bottom) this.die();
  }

  private rect() {
    const p = this.p, h = p.ball || p.rolling || p.crouch ? 28 : 44;
    return { l: p.x - 12, r: p.x + 12, t: p.y - h, b: p.y };
  }

  private stepWorld() {
    const p = this.p, L = this.level, inp = this.input, rc = this.rect();

    for (const r of L.rings) {
      if (r.got || Math.abs(r.x - p.x) > 40) continue;
      const dx = r.x - p.x, dy = r.y - (p.y - 22);
      if (dx * dx + dy * dy < 900) {
        r.got = true; this.rings++; this.score += 10; sfx.play('ring');
        this.burst(r.x, r.y, 5, '#ffd23d', 2);
        if (this.rings >= 100) { this.rings -= 100; this.lives++; sfx.play('checkpoint'); }
      }
    }

    for (const s of L.springs) {
      if (s.t > 0) s.t--;
      if (Math.abs(p.x - s.x) < 22 && p.y > s.y - 22 && p.y < s.y + 12 && p.vy >= 0 && p.hurt <= 0) {
        s.t = 14; p.vy = -16.5; p.grounded = false; p.plat = null; p.ball = false; p.rolling = false; p.springed = true; p.coyote = 0;
        sfx.play('spring'); this.burst(s.x, s.y - 10, 8, '#fff', 3);
      }
    }

    for (const sp of L.spikes) {
      if (rc.r > sp.x && rc.l < sp.x + sp.w && rc.b > sp.y - 20 && rc.t < sp.y) { this.hit(sp.x + sp.w / 2); break; }
    }

    for (const e of L.enemies) {
      if (!e.alive || Math.abs(e.x - p.x) > 1300) continue;
      e.t++;
      if (e.kind === 'crawler') {
        e.x += e.dir * e.speed;
        if (e.x > e.x1) e.dir = -1; else if (e.x < e.x0) e.dir = 1;
        e.y = groundAt(L, e.x) ?? e.base;
      } else {
        e.x += e.dir * e.speed * 1.3;
        if (e.x > e.x1) e.dir = -1; else if (e.x < e.x0) e.dir = 1;
        e.y = e.base + Math.sin(e.t * 0.06) * 25;
      }
      const top = e.kind === 'crawler' ? e.y - 26 : e.y - 14, bot = e.kind === 'crawler' ? e.y : e.y + 14;
      if (rc.r > e.x - 16 && rc.l < e.x + 16 && rc.b > top && rc.t < bot) {
        if (p.ball || p.rolling || (p.vy > 1 && p.prevY <= top + 14)) {
          e.alive = false; this.score += 100; sfx.play('stomp');
          this.burst(e.x, e.y - 10, 12, e.kind === 'crawler' ? '#ff6b5a' : '#c77dff', 5);
          if (!p.grounded) { p.vy = inp.jump ? -9.5 : -6.5; p.ball = true; p.springed = true; }
        } else this.hit(e.x);
      }
    }

    for (const c of L.checkpoints) {
      if (!c.active && p.x >= c.x) {
        c.active = true; this.respawnX = c.x; this.score += 50; sfx.play('checkpoint');
        this.burst(c.x, (groundAt(L, c.x) ?? p.y) - 70, 14, '#7dd3ff', 4);
      }
    }

    if (p.x >= L.finishX) this.finish();
  }

  private hit(srcX: number) {
    const p = this.p;
    if (p.inv > 0 || p.win || this.finishing) return;
    if (this.rings > 0) {
      for (let i = 0; i < Math.min(12, this.rings); i++) {
        const a = (i / 12) * Math.PI * 2;
        this.spawn(p.x, p.y - 24, Math.cos(a) * 4, Math.sin(a) * 4 - 3, 50, 5, '#ffd23d', 'ring', 0.25);
      }
      this.rings = 0; sfx.play('hit');
      p.inv = 120; p.hurt = 24; p.vy = -7; p.vx = (p.x < srcX ? -1 : 1) * 4.5;
      p.grounded = false; p.plat = null; p.rolling = false; p.ball = false; p.crouch = false;
    } else this.die();
  }

  private die() {
    if (this.finishing || this.status !== 'running') return;
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0; this.status = 'gameover'; sfx.play('over');
      this.p.hurt = 999; this.p.vx = 0;
      const newBest = this.score > this.best;
      if (newBest) { this.best = this.score; saveBest(this.score); }
      this.emitHud();
      this.cb.onStatus('gameover', { score: this.score, best: this.best, newBest, timeBonus: 0, ringBonus: 0, time: this.tick / 60, lives: 0 });
      return;
    }
    sfx.play('hit');
    const p = this.p;
    p.x = this.respawnX; p.y = groundAt(this.level, p.x) ?? 520; p.prevY = p.y;
    p.vx = 0; p.vy = 0; p.grounded = true; p.plat = null; p.rolling = false; p.ball = false; p.crouch = false;
    p.inv = 120; p.hurt = 0; this.rings = 0;
    this.cameraStep(true);
    this.emitHud();
  }

  private finish() {
    this.finishing = true; this.p.win = true; this.winTimer = 0;
    const time = this.tick / 60;
    const timeBonus = Math.max(0, Math.round(this.level.par - time)) * 20, ringBonus = this.rings * 25;
    this.score += timeBonus + ringBonus;
    const newBest = this.score > this.best;
    if (newBest) { this.best = this.score; saveBest(this.score); }
    markCleared(this.idx);
    this.endInfo = { score: this.score, best: this.best, newBest, timeBonus, ringBonus, time, lives: this.lives };
    sfx.play('win');
    this.burst(this.p.x, this.p.y - 40, 30, '#ffd23d', 6);
    this.emitHud();
  }

  private stepParticles() {
    const a = this.parts;
    for (let i = a.length - 1; i >= 0; i--) {
      const q = a[i];
      q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.life--;
      if (q.life <= 0) { a[i] = a[a.length - 1]; a.pop(); }
    }
  }

  private cameraStep(snap = false) {
    const p = this.p, L = this.level;
    const tx = p.x - this.vw * 0.38 + Math.max(-120, Math.min(220, p.vx * 16));
    const ty = p.y - this.vh * 0.6;
    const maxX = Math.max(0, L.segs[L.segs.length - 1].x1 - this.vw);
    this.cam.x += (Math.max(0, Math.min(maxX, tx)) - this.cam.x) * (snap ? 1 : 0.14);
    this.cam.y += (ty - this.cam.y) * (snap ? 1 : 0.1);
  }
}
