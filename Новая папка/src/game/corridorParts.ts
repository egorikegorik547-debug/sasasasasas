// @ts-nocheck
// Геометрические помощники для модели «Коридорного»: лофт по сечениям, форма головы, текстура лица, кисть руки.
import * as THREE from 'three';
import { noise3, rng } from './modelKit';

export const TAU = Math.PI * 2;
export const r0 = k => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };

/* ---------- лофт: гладкая поверхность по эллиптическим сечениям (снизу вверх) ----------
   sec = { y, rx, rz, cx, cz }; o.shape(x,y,z) — искажение формы; o.wr(a,y) — смещение наружу (складки ткани) */
export function loft(secs, o = {}) {
  const seg = o.seg || 18, n = secs.length, us = o.uvs || 3.3;
  const pos = [], uv = [], idx = [];
  let vAcc = 0;
  for (let i = 0; i < n; i++) {
    const s = secs[i], cx = s.cx || 0, cz = s.cz || 0;
    if (i > 0) { const p = secs[i - 1]; vAcc += Math.hypot(s.y - p.y, cx - (p.cx || 0), cz - (p.cz || 0)); }
    const circ = TAU * Math.sqrt((s.rx * s.rx + s.rz * s.rz) / 2);
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * TAU, sa = Math.sin(a), ca = Math.cos(a);
      const w = o.wr ? o.wr(a, s.y, i) : 0;
      let x = cx + (s.rx + w) * sa, y = s.y, z = cz + (s.rz + w) * ca;
      if (o.shape) { const r = o.shape(x, y, z); x = r[0]; y = r[1]; z = r[2]; }
      pos.push(x, y, z); uv.push(j / seg * circ * us, vAcc * us);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const addCap = (i, up) => {
    const base = pos.length / 3;
    let cxx = 0, cyy = 0, czz = 0;
    for (let j = 0; j < seg; j++) { const k = (i * row + j) * 3; cxx += pos[k]; cyy += pos[k + 1]; czz += pos[k + 2]; }
    pos.push(cxx / seg, cyy / seg, czz / seg); uv.push(0, 0);
    for (let j = 0; j <= seg; j++) { const k = (i * row + j) * 3; pos.push(pos[k], pos[k + 1], pos[k + 2]); uv.push(j / seg, 1); }
    for (let j = 0; j < seg; j++) { if (up) idx.push(base, base + 1 + j, base + 2 + j); else idx.push(base, base + 2 + j, base + 1 + j); }
  };
  if (o.capTop) addCap(n - 1, true);
  if (o.capBot) addCap(0, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // сшиваем нормали по шву, чтобы не было полосы
  const nr = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const a = i * row, b = a + seg;
    const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}
// складки ткани: шум по высоте и углу
export const folds = (amp, fy = 9, fa = 3, seed = 0) => (a, y) => amp * (noise3(Math.sin(a) * fa + seed, y * fy, Math.cos(a) * fa - seed) * 2 - 1);

/* ---------- форма головы ---------- */
const RX = 0.092, RY = 0.125, RZ = 0.1;
const gauss = (d2, k) => Math.exp(-d2 / k);
// dx,dy,dz — направление на единичной сфере; grow — выпячивание наружу (для ткани)
export function headPoint(dx, dy, dz, grow = 0) {
  let x = dx * RX, y = dy * RY, z = dz * RZ;
  if (dy < 0) { const t = -dy; x *= 1 - 0.3 * Math.pow(t, 1.3); z *= 1 - 0.1 * t; }          // сужение к подбородку
  if (dy < -0.3 && dz > 0) z += 0.02 * ((-dy - 0.3) / 0.7) * dz;                              // вытянутый подбородок
  if (dz < 0) z *= 1.12;                                                                      // затылок
  const fr = Math.max(0, dz);
  z += 0.011 * gauss((dy - 0.3) * (dy - 0.3), 0.012) * fr * gauss(dx * dx, 0.5);              // надбровья
  for (const s of [-1, 1]) {
    const ex = dx - s * 0.4, ey = dy - 0.15;
    z -= 0.026 * gauss(ex * ex * 1.1 + ey * ey * 2.8, 0.022) * fr;                           // глазницы
    const cx = dx - s * 0.56, cy = dy + 0.2;
    z -= 0.011 * gauss(cx * cx + cy * cy, 0.03) * fr;                                        // впалые щёки
    const tx = dx - s * 0.82, ty = dy - 0.18;
    x -= s * 0.006 * gauss(tx * tx + ty * ty, 0.04);                                         // виски
  }
  z += 0.03 * gauss(dx * dx * 45 + (dy + 0.06) * (dy + 0.06) * 0.5, 0.02) * fr;              // нос
  return [x + dx * grow, y + dy * grow, z + dz * grow];
}
export function headGeo(thStart = 0, thLen = Math.PI, grow = 0, fold = 0) {
  const g = new THREE.SphereGeometry(1, 56, 40, 0, TAU, thStart, thLen), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i), dy = p.getY(i), dz = p.getZ(i);
    let gr = grow;
    if (fold) gr += fold * ((noise3(dx * 4.2, dy * 5.5, dz * 4.2) * 2 - 1) * 0.7 + Math.sin(dx * 16 + dy * 11) * 0.45);
    const r = headPoint(dx, dy, dz, gr); p.setXYZ(i, r[0], r[1], r[2]);
  }
  g.computeVertexNormals();
  return g;
}


/* ---------- жуткая улыбка: рот до ушей, нижняя челюсть отвисла очень низко ----------
   Голова — единая сетка: верхняя часть (до линии рта) и нижняя (челюсть). Линия рта изгибается вверх к уголкам (улыбка),
   а челюсть смещена вниз тем сильнее, чем ближе к центру лица; у ушей щель сходит на нет. Между губами — тёмная пасть-воронка. */
export const GRIN_W = 1.05;                                   // азимут уголков рта (0 — строго вперёд)
export const JAW = { drop: 0.112, stretch: 0.4 };             // на сколько опущена челюсть и насколько вытянут подбородок
const sstep = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const grinCut = phi => { const a = Math.min(1, Math.abs(phi) / GRIN_W); return -0.52 + 0.42 * Math.pow(a, 1.45); };   // dy линии рта
export const jawW = phi => sstep((1 - Math.abs(phi) / GRIN_W) * 1.35);
const dirAt = (phi, th) => { const s = Math.sin(th); return [Math.sin(phi) * s, Math.cos(th), Math.cos(phi) * s]; };
const upRing = (phi, grow = 0) => { const d = dirAt(phi, Math.acos(grinCut(phi))); return headPoint(d[0], d[1], d[2], grow); };
function jawPoint(phi, th, ringY, v, grow = 0) {
  const d = dirAt(phi, th), p = headPoint(d[0], d[1], d[2], grow), w0 = jawW(phi), w = w0 + (1 - w0) * sstep((v - 0.45) / 0.55);
  return [p[0], p[1] - w * (JAW.drop + JAW.stretch * Math.max(0, ringY - p[1])), p[2] + w * 0.012 * Math.max(0, d[2])];
}
const loRing = (phi, grow = 0) => { const th = Math.acos(grinCut(phi)); return jawPoint(phi, th, upRing(phi)[1], 0, grow); };
export const lipRing = (phi, low, grow = 0) => (low ? loRing(phi, grow) : upRing(phi, grow));
export const gapAt = phi => upRing(phi)[1] - loRing(phi)[1];
export const phiAt = (i, W = 72) => -Math.PI + i / W * TAU;

export function headGeoGrin(W = 72, NU = 46, NL = 18) {
  const pos = [], uv = [], idx = [], row = W + 1, ringY = [], gap = [];
  for (let i = 0; i <= W; i++) { const ph = phiAt(i, W); ringY.push(upRing(ph)[1]); gap.push(gapAt(ph)); }
  for (let k = 0; k <= NU; k++) for (let i = 0; i <= W; i++) {
    const ph = phiAt(i, W), thc = Math.acos(grinCut(ph)), th = thc * k / NU, d = dirAt(ph, th), p = headPoint(d[0], d[1], d[2]);
    pos.push(p[0], p[1], p[2]); uv.push(0.25 + ph / TAU, th / Math.PI);
  }
  const baseL = (NU + 1) * row;
  for (let k = 0; k <= NL; k++) for (let i = 0; i <= W; i++) {
    const ph = phiAt(i, W), thc = Math.acos(grinCut(ph)), v = k / NL, th = thc + (Math.PI - thc) * v, p = jawPoint(ph, th, ringY[i], v);
    pos.push(p[0], p[1], p[2]); uv.push(0.25 + ph / TAU, th / Math.PI);
  }
  const quads = (b, R) => { for (let k = 0; k < R; k++) for (let i = 0; i < W; i++) { const a = b + k * row + i, bq = a + 1, c = a + row, d = c + 1; idx.push(a, c, bq, bq, c, d); } };
  quads(0, NU); quads(baseL, NL);
  // где щель закрыта (у ушей и на затылке) — сшиваем верхнюю и нижнюю части
  const topRow = NU * row;
  for (let i = 0; i < W; i++) if (gap[i] < 0.0025 && gap[i + 1] < 0.0025) { const a = topRow + i, bq = a + 1, c = baseL + i, d = c + 1; idx.push(a, c, bq, bq, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nr = g.attributes.normal;
  const merge = (a, b) => { const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); };
  for (let i = 0; i <= W; i++) if (gap[i] < 0.0025) merge(topRow + i, baseL + i);
  merge(0, 0);
  for (let k = 0; k <= NU; k++) merge(k * row, k * row + W);                 // шов по затылку
  for (let k = 0; k <= NL; k++) merge(baseL + k * row, baseL + k * row + W);
  return g;
}
// тёмная пасть: воронка между верхней и нижней губой (края — красные дёсны, в глубине — чернота)
export function mouthGeo(W = 72, R = 10) {
  const pos = [], col = [], idx = [], row = W + 1;
  for (let k = 0; k <= R; k++) {
    const t = k / R, sh = Math.sin(Math.PI * t), dark = Math.pow(sh, 0.45);
    for (let i = 0; i <= W; i++) {
      const ph = phiAt(i, W), a = upRing(ph, -0.002), b = loRing(ph, -0.002);
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t, zc = -0.004;
      pos.push(x * (1 - sh), y, zc + (z - zc) * (1 - sh));
      { const f = Math.pow(1 - dark, 1.6); col.push(0.075 * f, 0.006 * f, 0.008 * f); }
    }
  }
  for (let k = 0; k < R; k++) for (let i = 0; i < W; i++) { const a = k * row + i, bq = a + 1, c = a + row, d = c + 1; idx.push(a, c, bq, bq, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); return g;
}
// зубы: два ряда острых мелких зубов по краю улыбки + губы-нитки
export function buildGrin(P, teeth, teethD, lip) {
  const W = 72, lim = GRIN_W * 0.93;
  for (let i = 0; i <= W; i++) {
    const ph = phiAt(i, W); if (Math.abs(ph) > lim) continue;
    const gp = gapAt(ph), edge = Math.min(1, Math.abs(Math.abs(ph) - GRIN_W) * 3.2);
    for (const low of [false, true]) {
      const b = lipRing(ph, low, -0.003), d = dirAt(ph, Math.acos(grinCut(ph))), inward = [-d[0] * 0.25, 0, -d[2] * 0.25];
      let L = (low ? 0.016 : 0.014) + r0(i * 1.7 + (low ? 31 : 7)) * (low ? 0.026 : 0.03);
      if (i % 5 === 2) L *= 1.45;                                             // редкие клыки
      L = Math.min(L, Math.max(0.006, gp * 0.55)) * (0.35 + 0.65 * edge);
      const sgn = low ? 1 : -1, tilt = (r0(i + 3) - 0.5) * 0.35;
      P.cone(i % 3 ? teeth : teethD, 0.0041 + r0(i) * 0.0012, L, b, [tilt + inward[0], sgn, inward[2] + (r0(i + 9) - 0.5) * 0.3], 5);
    }
  }
  // натянутые губы — тонкие бледные нити вдоль рта
  for (const low of [false, true]) {
    const pts = [];
    for (let i = 0; i <= W; i++) { const ph = phiAt(i, W); if (Math.abs(ph) <= GRIN_W) pts.push(lipRing(ph, low, 0.0015)); }
    P.tube(lip, pts, 0.0034, 0.0034, 56, 6);
  }
}

/* ---------- текстура головы: бледная кожа, вены, глазницы ---------- */
function blot(c, x, y, r, rgb, a, sy = 1) {
  c.save(); c.translate(x, y); c.scale(1, sy);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.restore();
}
let _headTex = null;
export function headTexture() {
  if (_headTex) return _headTex;
  const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), r = rng(4242);
  c.fillStyle = '#dcdad0'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { const v = 170 + r() * 70 | 0; blot(c, r() * W, r() * H, 14 + r() * 50, `${v},${v},${v - 6}`, 0.2); }
  for (let i = 0; i < 40; i++) blot(c, r() * W, r() * H * 0.6, 20 + r() * 40, '150,140,150', 0.14);
  // тонкие синеватые вены на лбу и висках
  c.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const side = r() < 0.5 ? -1 : 1;
    let x = (0.25 + side * (0.02 + r() * 0.17)) * W, y = (0.12 + r() * 0.3) * H, a = r() * TAU;
    c.strokeStyle = `rgba(${90 + r() * 30 | 0},${100 + r() * 30 | 0},${135 + r() * 30 | 0},${0.18 + r() * 0.2})`; c.lineWidth = 0.8 + r() * 1.4; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 5; y += Math.sin(a) * 4; c.lineTo(x, y); }
    c.stroke();
  }
  // поры и пятна
  for (let i = 0; i < 5200; i++) { c.fillStyle = `rgba(60,55,50,${0.04 + r() * 0.08})`; c.fillRect(r() * W, r() * H, 1.4, 1.4); }
  // круги под глазами и чёрные глазницы
  for (const s of [-1, 1]) {
    const cx = (0.25 + s * 0.0646) * W, cy = 0.449 * H;
    blot(c, cx, cy - 4, 62, '60,48,62', 0.48, 0.62);
    blot(c, cx, cy + 4, 46, '24,18,24', 0.8, 0.6);
    blot(c, cx, cy, 30, '2,1,2', 1, 0.62);
    blot(c, cx, cy, 20, '0,0,0', 1, 0.62);
  }
  blot(c, 0.25 * W, 0.43 * H, 26, '90,84,84', 0.25, 1.4);          // переносица
  // нижняя часть лица: впалые серые щёки, тени у уголков рта и натянутая кожа складками к ушам
  for (const s of [-1, 1]) {
    const ux = (0.25 + s * GRIN_W / TAU) * W, vy = Math.acos(grinCut(GRIN_W)) / Math.PI * H;
    blot(c, ux - s * 6, vy - 8, 54, '58,50,56', 0.5, 1.1);
    blot(c, ux, vy, 26, '20,14,18', 0.75, 1);
    c.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const a = -0.35 - k * 0.14, len = 34 + r() * 26; c.strokeStyle = `rgba(48,40,46,${0.32 + r() * 0.3})`; c.lineWidth = 1 + r() * 1.6;
      c.beginPath(); c.moveTo(ux, vy); c.quadraticCurveTo(ux + s * len * 0.5, vy + a * 22 - 8, ux + s * len * Math.cos(a) * 1.1, vy + Math.sin(a) * len * 0.9 - 6); c.stroke();
    }
    blot(c, (0.25 + s * 0.05) * W, 0.69 * H, 60, '70,64,68', 0.32, 0.8);       // тень под челюстью
  }
  blot(c, 0.25 * W, 0.78 * H, 80, '84,80,84', 0.3, 0.6);
  // кожа на макушке чуть темнее и серее
  const gr = c.createLinearGradient(0, 0, 0, 0.3 * H); gr.addColorStop(0, 'rgba(120,118,112,.45)'); gr.addColorStop(1, 'rgba(120,118,112,0)');
  c.fillStyle = gr; c.fillRect(0, 0, W, 0.3 * H);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  return (_headTex = t);
}

/* ---------- кисть: длинные пальцы, ладонь обращена к бедру, большой палец вперёд ---------- */
export function buildHand(P, s, skin, skinD, nail) {
  P.sphere(skin, 0.032, 0, -0.05, 0, 0.55, 1.5, 1.1, { w: 10, h: 8 });
  const lens = [0.085, 0.098, 0.092, 0.074];
  for (let k = 0; k < 4; k++) {
    const z = (1.5 - k) * 0.0215, L = lens[k];
    P.sphere(skinD, 0.0105, 0, -0.084, z, 0.8, 0.9, 1, { w: 6, h: 5 });                          // костяшка
    P.limb(skinD, [s * 0.014, -0.03, z * 0.8], [s * 0.014, -0.088, z], 0.0045, 0.0042, 4);          // сухожилие на тыльной стороне
    let a = 0.16 + (k % 2) * 0.12 + r0(k) * 0.1, px = 0, py = -0.088, pz = z;
    const segs = [0.5, 0.3, 0.2], rad = [0.0086, 0.0074, 0.0062, 0.0046];
    for (let q = 0; q < 3; q++) {
      const len = L * segs[q];
      const nx = px - s * Math.sin(a) * len, ny = py - Math.cos(a) * len, nz = pz + (1.5 - k) * 0.0035;
      P.limb(skin, [px, py, pz], [nx, ny, nz], rad[q], rad[q + 1], 6);
      if (q < 2) P.sphere(skinD, rad[q + 1] * 1.05, nx, ny, nz, 1, 1, 1, { w: 6, h: 5 });        // сустав
      px = nx; py = ny; pz = nz; a += 0.34 + q * 0.28 + r0(k + q) * 0.12;
    }
    P.cone(nail, 0.0052, 0.016, [px, py, pz], [-s * Math.sin(a - 0.4), -Math.cos(a - 0.4), 0], 4);   // тёмный ноготь
  }
  // большой палец — вперёд
  let px = -s * 0.016, py = -0.045, pz = 0.028;
  const tdirs = [[-s * 0.25, -0.7, 0.65], [-s * 0.4, -0.75, 0.55]], tl = [0.048, 0.04], tr = [0.011, 0.0085, 0.0062];
  for (let q = 0; q < 2; q++) {
    const d = new THREE.Vector3(...tdirs[q]).normalize(), nx = px + d.x * tl[q], ny = py + d.y * tl[q], nz = pz + d.z * tl[q];
    P.limb(skin, [px, py, pz], [nx, ny, nz], tr[q], tr[q + 1], 6); P.sphere(skinD, tr[q + 1], nx, ny, nz, 1, 1, 1, { w: 6, h: 5 }); px = nx; py = ny; pz = nz;
  }
}
