import type { Game } from './engine';
import type { Enemy, Seg } from './types';
import { groundAt, segY } from './levels';

const TAU = Math.PI * 2;
type C = CanvasRenderingContext2D;

function tri(ctx: C, pts: number[][]) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function rr(ctx: C, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export type Pose = 'idle' | 'run' | 'ball' | 'hurt' | 'win' | 'crouch' | 'fall';

/** Original cartoon hedgehog hero, drawn procedurally. Origin = feet. */
export function drawHero(ctx: C, x: number, y: number, face: number, pose: Pose, t: number, speed: number) {
  const BLUE = '#1f6bff', DB = '#0f3fb5', TAN = '#f8cfa0', RED = '#e8312d';
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (pose === 'ball') {
    ctx.translate(0, -14); ctx.rotate(t * 0.55);
    ctx.fillStyle = DB;
    for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate((k * TAU) / 8); tri(ctx, [[10, -6], [25, 0], [10, 6]]); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 9, 3.6, 4.9); ctx.stroke();
    ctx.restore(); return;
  }
  const run = pose === 'run', hurt = pose === 'hurt', win = pose === 'win', crouch = pose === 'crouch', fall = pose === 'fall';
  const ph = t * (0.2 + speed * 0.024);
  const lean = run ? Math.min(speed / 10, 1.2) * 0.2 : fall ? 0.05 : 0;
  ctx.translate(0, -14); ctx.rotate(hurt ? Math.sin(t * 0.7) * 0.3 - 0.15 : lean); ctx.translate(0, 14);
  if (crouch) ctx.scale(1, 0.72);
  ctx.translate(0, -(run ? Math.abs(Math.sin(ph)) * 2.5 : pose === 'idle' ? Math.sin(t * 0.07) * 0.8 : 0));

  // back spikes
  ctx.fillStyle = BLUE; ctx.strokeStyle = DB; ctx.lineWidth = 1.5;
  const sw = run ? -6 : 0;
  for (const s of [[[-2, -42], [-36 + sw, -52], [-10, -31]], [[-8, -34], [-42 + sw, -35], [-12, -22]], [[-5, -25], [-34 + sw, -17], [-8, -13]]]) { tri(ctx, s); ctx.fill(); ctx.stroke(); }

  // legs + red shoes
  if (run && speed > 9) {
    ctx.fillStyle = 'rgba(232,49,45,.65)'; ctx.beginPath(); ctx.ellipse(2, -7, 14, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(2, -7, 10, ph, ph + 4); ctx.stroke();
  } else {
    for (const side of [-1, 1]) {
      let lx = side * 5, ly = 0;
      if (run) { const a = ph + (side > 0 ? 0 : Math.PI); lx = Math.sin(a) * 10; ly = -Math.max(0, Math.cos(a)) * 6; }
      else if (fall) { lx = side * 7 + (side > 0 ? 4 : -2); ly = side > 0 ? -6 : 0; }
      else if (hurt) { lx = side * 9; ly = -4; }
      else if (crouch) lx = side * 8;
      ctx.strokeStyle = DB; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(side * 2, -12); ctx.lineTo(lx, -6 + ly); ctx.stroke();
      ctx.fillStyle = RED; ctx.beginPath(); ctx.ellipse(lx + 4, -4 + ly, 11, 6.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(lx, -9 + ly, 5, 8);
      ctx.fillStyle = '#ffd23d'; ctx.fillRect(lx + 1, -8 + ly, 3, 3);
    }
  }

  // torso
  ctx.fillStyle = BLUE; ctx.beginPath(); ctx.ellipse(0, -17, 11, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(4, -14, 6, 8, 0, 0, TAU); ctx.fill();

  // head + ear
  ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(2, -30, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = DB; ctx.lineWidth = 1.5; tri(ctx, [[0, -42], [6, -57], [13, -41]]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(10, -25, 8.5, 6.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(16, -28, 2.6, 0, TAU); ctx.fill();

  // eye
  const blink = pose === 'idle' && Math.floor(t / 4) % 50 === 0;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4;
  if (hurt) {
    ctx.beginPath(); ctx.moveTo(4, -37); ctx.lineTo(11, -30); ctx.moveTo(11, -37); ctx.lineTo(4, -30); ctx.stroke();
  } else if (win || blink) {
    ctx.beginPath(); ctx.arc(8, win ? -31 : -33, 4.5, win ? Math.PI : 0, win ? TAU : Math.PI); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(8, -33, 6, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1d7a33'; ctx.beginPath(); ctx.arc(10, -32, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(10.5, -32, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11.5, -34, 1, 0, TAU); ctx.fill();
  }
  if (!hurt && !win) { ctx.strokeStyle = DB; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, run || fall ? -43 : -42); ctx.lineTo(13, run || fall ? -38.5 : -41); ctx.stroke(); }
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
  if (win) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(11, -20, 4.5, 3.5, 0, 0, TAU); ctx.fill(); }
  else if (hurt) { ctx.beginPath(); ctx.ellipse(11, -20, 2.5, 3, 0, 0, TAU); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(11, -23, 3.6, 0.3, 2.7); ctx.stroke(); }

  // arms + white gloves
  for (const side of [-1, 1]) {
    let hx = side * 6 + 2, hy = -10;
    if (win) { hx = side > 0 ? 12 + Math.sin(t * 0.3) * 3 : -4; hy = side > 0 ? -50 : -8; }
    else if (run) { const a = ph + (side > 0 ? Math.PI : 0); hx = 4 + Math.sin(a) * 11; hy = -14 + Math.min(0, Math.cos(a)) * 4; }
    else if (fall) { hx = side * 10 + (side > 0 ? 8 : -6); hy = -30; }
    else if (hurt) { hx = side * 14; hy = -30; }
    ctx.strokeStyle = TAN; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(ctx: C, e: Enemy, f: number) {
  if (!e.alive) return;
  ctx.save(); ctx.translate(e.x, e.y); ctx.lineCap = 'round';
  if (e.kind === 'crawler') {
    ctx.scale(e.dir > 0 ? 1 : -1, 1);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) { const lx = -9 + k * 9, s = Math.sin(f * 0.3 + k * 2) * 3; ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx + s, 0); ctx.stroke(); }
    ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(0, -7, 16, Math.PI, 0); ctx.lineTo(16, -5); ctx.lineTo(-16, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; for (const dx of [-8, 0]) { ctx.beginPath(); ctx.arc(dx, -15, 2.4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(9, -11, 5, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(11, -11, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -19); ctx.lineTo(14, -15); ctx.stroke();
  } else {
    ctx.scale(e.dir > 0 ? 1 : -1, 1);
    const w = Math.sin(f * 0.5) * 0.7;
    ctx.fillStyle = 'rgba(220,235,255,.8)';
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(-2, -10); ctx.rotate(s * w - 0.3); ctx.beginPath(); ctx.ellipse(0, -9, 6, 13, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd23d'; ctx.fillRect(-6, -10, 4, 20); ctx.fillRect(2, -10, 4, 20);
    tri(ctx, [[-16, -3], [-26, 0], [-16, 3]]); ctx.fillStyle = '#222'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(11, -3, 5, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(13, -3, 2.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function traceTop(ctx: C, s: Seg, a: number, b: number, dy: number) {
  ctx.beginPath(); ctx.moveTo(a, segY(s, a) + dy);
  for (let x = a + 12; x < b; x += 12) ctx.lineTo(x, segY(s, x) + dy);
  ctx.lineTo(b, segY(s, b) + dy);
}

export function draw(ctx: C, g: Game) {
  const { vw, vh, cam, level: L, p } = g, th = L.theme, f = g.frame;
  ctx.setTransform(g.dpr * g.scale, 0, 0, g.dpr * g.scale, 0, 0);

  // sky, sun, stars, clouds, parallax hills
  const sky = ctx.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, th.skyTop); sky.addColorStop(1, th.skyBot);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh);
  if (th.stars) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(f * 0.03 + i)); const s = 1 + (i % 3) * 0.6; ctx.fillRect(((i * 977) % 1000) / 1000 * vw, ((i * 613) % 1000) / 1000 * vh * 0.65, s, s); }
    ctx.globalAlpha = 1;
  }
  const sx = vw * 0.8, sy = vh * 0.18, sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 90);
  sg.addColorStop(0, th.sun); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 90, 0, TAU); ctx.fill();
  ctx.fillStyle = th.cloud;
  const m = vw + 500;
  for (let i = 0; i < 6; i++) {
    const cx = ((((i * 430 - cam.x * 0.1 + f * 0.1) % m) + m) % m) - 250, cy = 50 + (i % 3) * 55 - cam.y * 0.02;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.arc(cx + 30, cy - 10, 32, 0, TAU); ctx.arc(cx + 62, cy, 24, 0, TAU); ctx.fill(); ctx.fillRect(cx, cy, 62, 24);
  }
  const hills = (fac: number, base: number, amp: number, col: string) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, vh);
    const off = -(cam.y - 350) * fac * 0.4;
    for (let x = 0; x <= vw + 16; x += 16) { const wx = x + cam.x * fac; ctx.lineTo(x, base + off + Math.sin(wx * 0.004) * amp + Math.sin(wx * 0.011 + 1) * amp * 0.4); }
    ctx.lineTo(vw + 16, vh); ctx.closePath(); ctx.fill();
  };
  hills(0.2, vh * 0.62, 50, th.far); hills(0.4, vh * 0.74, 34, th.near);

  // ---- world ----
  ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  const x0 = cam.x - 60, x1 = cam.x + vw + 60, yb = cam.y + vh + 60;

  for (const s of L.segs) {
    if (s.gap || s.x1 < x0 || s.x0 > x1) continue;
    const a = Math.max(s.x0, Math.floor(x0 / 12) * 12), b = Math.min(s.x1, x1);
    traceTop(ctx, s, a, b, 0); ctx.lineTo(b, yb); ctx.lineTo(a, yb); ctx.closePath();
    ctx.fillStyle = th.dirtB; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = th.dirtA;
    const S = 48, top = Math.min(segY(s, a), segY(s, b), segY(s, (a + b) / 2)) - 60;
    for (let r = Math.floor(top / S); r <= Math.floor(yb / S); r++) for (let c = Math.floor(a / S); c <= Math.floor(b / S); c++) if ((r + c) & 1) ctx.fillRect(c * S, r * S, S, S);
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ctx.strokeStyle = th.grassDark; ctx.lineWidth = 5; traceTop(ctx, s, a, b, 17); ctx.stroke();
    ctx.strokeStyle = th.grass; ctx.lineWidth = 16; traceTop(ctx, s, a, b, 8); ctx.stroke();
  }

  for (const pl of L.plats) {
    if (pl.x + pl.w < x0 || pl.x > x1) continue;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; rr(ctx, pl.x + 4, pl.y + 6, pl.w, 18, 8); ctx.fill();
    ctx.fillStyle = th.plats[pl.c % th.plats.length]; rr(ctx, pl.x, pl.y, pl.w, 18, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; rr(ctx, pl.x + 4, pl.y + 2, pl.w - 8, 5, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let sx2 = pl.x + 12; sx2 < pl.x + pl.w - 8; sx2 += 24) ctx.fillRect(sx2, pl.y + 10, 10, 5);
  }

  for (const sp of L.spikes) {
    if (sp.x + sp.w < x0 || sp.x > x1) continue;
    ctx.fillStyle = '#5a6577'; ctx.fillRect(sp.x, sp.y - 2, sp.w, 8);
    for (let sx2 = sp.x; sx2 < sp.x + sp.w - 1; sx2 += 20) {
      tri(ctx, [[sx2, sp.y], [sx2 + 10, sp.y - 24], [sx2 + 20, sp.y]]);
      ctx.fillStyle = '#e3e9f1'; ctx.fill(); ctx.strokeStyle = '#6b7a8c'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  for (const s of L.springs) {
    if (s.x < x0 || s.x > x1) continue;
    const k = s.t / 14, h = 20 * (1 - 0.55 * k);
    ctx.fillStyle = '#444'; rr(ctx, s.x - 20, s.y - 6, 40, 8, 3); ctx.fill();
    ctx.strokeStyle = '#c8d0da'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x - 12, s.y - 6);
    for (let i = 1; i <= 4; i++) ctx.lineTo(s.x + (i % 2 ? 12 : -12), s.y - 6 - (h * i) / 4);
    ctx.stroke();
    ctx.fillStyle = '#ff3b3b'; rr(ctx, s.x - 22, s.y - 12 - h, 44, 9, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(s.x - 16, s.y - 11 - h, 20, 2);
  }

  for (const c of L.checkpoints) {
    if (c.x < x0 || c.x > x1) continue;
    const y = groundAt(L, c.x) ?? 0;
    ctx.fillStyle = '#d7dde6'; ctx.fillRect(c.x - 3, y - 74, 6, 74);
    ctx.fillStyle = c.active ? '#ff4757' : '#4a90ff'; ctx.beginPath(); ctx.arc(c.x, y - 80, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(c.x - 3, y - 84, 3.5, 0, TAU); ctx.fill();
    if (c.active) { ctx.strokeStyle = 'rgba(255,71,87,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, y - 80, 15 + Math.sin(f * 0.15) * 3, 0, TAU); ctx.stroke(); }
  }

  if (L.finishX > x0 - 200 && L.finishX < x1) {
    const fx = L.finishX, y = groundAt(L, fx) ?? 520;
    ctx.fillStyle = '#e8edf4'; ctx.fillRect(fx - 5, y - 170, 10, 170); ctx.fillRect(fx + 115, y - 170, 10, 170);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) { ctx.fillStyle = (r + c) & 1 ? '#111' : '#fff'; ctx.fillRect(fx + 5 + c * 10, y - 170 + r * 10 + Math.sin(f * 0.1 + c * 0.5) * 2, 10, 10); }
    ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.arc(fx, y - 174, 9, 0, TAU); ctx.arc(fx + 120, y - 174, 9, 0, TAU); ctx.fill();
  }

  for (const r of L.rings) {
    if (r.got || r.x < x0 || r.x > x1) continue;
    const w = Math.abs(Math.cos(f * 0.07 + r.ph)) * 9 + 2;
    ctx.strokeStyle = '#ffb703'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(r.x, r.y, w, 11, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, w, 11, 0, 3.4, 4.6); ctx.stroke();
  }

  for (const e of L.enemies) if (e.x > x0 - 40 && e.x < x1 + 40) drawEnemy(ctx, e, f);

  for (const q of g.parts) {
    const al = Math.max(0, q.life / q.max);
    ctx.globalAlpha = al;
    if (q.kind === 'line') { ctx.strokeStyle = q.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 2.4 - 14, q.y); ctx.stroke(); }
    else if (q.kind === 'ring') { ctx.strokeStyle = q.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.x, q.y, 6, 8, 0, 0, TAU); ctx.stroke(); }
    else { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + al * 0.5), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;

  let pose: Pose = 'idle';
  if (g.status === 'gameover' || p.hurt > 0) pose = 'hurt';
  else if (p.win) pose = 'win';
  else if (p.ball || p.rolling) pose = 'ball';
  else if (p.crouch) pose = 'crouch';
  else if (!p.grounded) pose = 'fall';
  else if (Math.abs(p.vx) > 0.6) pose = 'run';
  if (!(p.inv > 0 && p.hurt <= 0 && Math.floor(p.inv / 4) % 2 === 0)) drawHero(ctx, p.x, p.y, p.face, pose, p.anim, Math.abs(p.vx));
  ctx.restore();

  // speed vignette
  const sp = Math.min(1, (Math.abs(p.vx) - 9) / 8);
  if (sp > 0) {
    const v = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.35, vw / 2, vh / 2, vh * 0.95);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, `rgba(255,255,255,${0.28 * sp})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, vw, vh);
  }
}
