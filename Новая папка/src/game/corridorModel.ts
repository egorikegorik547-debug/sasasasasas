// @ts-nocheck
// «Коридорный» — одиночный сверххищник сети. Модель собрана по референсу:
//  • очень высокий и болезненно худой, сильно сутулый: плечи узкие и покатые, голова выброшена вперёд на тонкой шее;
//  • бледная лысая голова с чёрными провалами глазниц и жуткой улыбкой до ушей: нижняя челюсть отвисла очень низко, во рту — два ряда острых зубов;
//  • мешковатая белая рубашка с коротким рукавом, длинный чёрный галстук (висит вертикально, раскачивается);
//  • тонкие бледные руки до колен — локти слегка разведены, кисти с длинными пальцами;
//  • узкие чёрные брюки, согнутые в коленях ноги, чёрные туфли.
import * as THREE from 'three';
import { Part, std, ball, noise3 } from './modelKit';
import { loft, folds, headGeoGrin, mouthGeo, buildGrin, headTexture, buildHand } from './corridorParts';

export function buildCorridor(cfg) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x565c6a });

  const shirt = std(0xdedbd0, { tex: 'cloth', rough: 0.96, bump: 0.55, side: THREE.DoubleSide });
  const shirtD = std(0xa8a599, { tex: 'cloth', rough: 0.98, bump: 0.6, side: THREE.DoubleSide });
  for (const m of [shirt, shirtD]) m.map = null;   // без кровавых пятен текстуры — только плетение (bump) и грязь цветом
  const inside = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1, side: THREE.BackSide });
  const tie = std(0x08080a, { tex: 'cloth', rough: 0.55, bump: 0.3, side: THREE.DoubleSide });
  const pants = std(0x0f0f12, { tex: 'cloth', rough: 0.95, bump: 0.55 });
  const shoe = std(0x060607, { rough: 0.4, metal: 0.05 });
  const sole = std(0x161412, { rough: 0.8 });
  const skin = std(0xece8dc, { tex: 'skin', rough: 0.62, bump: 0.45 });
  const skinD = std(0xb9b4a7, { tex: 'skin', rough: 0.75, bump: 0.5 });
  const nail = std(0x2a2824, { rough: 0.5 });
  const teeth = std(0xd8d1b2, { rough: 0.45, bump: 0.1 });
  const teethD = std(0xb5ad8c, { rough: 0.55 });
  const lip = std(0x6f5d60, { rough: 0.5, bump: 0.2 });
  const mouthMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const metalBuckle = std(0x9a9a92, { rough: 0.3, metal: 0.8 });
  const button = std(0xcfcbbd, { rough: 0.4 });
  const headMat = new THREE.MeshStandardMaterial({ map: headTexture(), color: 0xf4f1e8, roughness: 0.6, metalness: 0.02 });

  const HIP = 0.98;

  /* ===== ноги: бедро → колено → голень → туфля ===== */
  const mkLeg = s => {
    const leg = new THREE.Group(); leg.position.set(s * 0.093, HIP, 0); g.add(leg);
    const P = new Part(leg);
    P.push(loft([
      { y: 0.05, rx: 0.074, rz: 0.08 }, { y: -0.08, rx: 0.078, rz: 0.082 }, { y: -0.26, rx: 0.066, rz: 0.068 },
      { y: -0.4, rx: 0.056, rz: 0.057 }, { y: -0.5, rx: 0.052, rz: 0.054 }
    ], { seg: 14, wr: folds(0.004, 10, 2, s) }), pants);
    P.sphere(pants, 0.055, 0, -0.5, 0.0, 0.95, 1, 0.9, { w: 10, h: 8 });
    P.flush();
    const knee = new THREE.Group(); knee.position.set(0, -0.5, 0); leg.add(knee);
    const K = new Part(knee);
    K.push(loft([
      { y: 0, rx: 0.052, rz: 0.054 }, { y: -0.1, rx: 0.052, rz: 0.054, cz: -0.004 }, { y: -0.26, rx: 0.042, rz: 0.042 },
      { y: -0.4, rx: 0.044, rz: 0.046 }, { y: -0.455, rx: 0.05, rz: 0.054, cz: 0.004 }
    ], { seg: 14, wr: folds(0.0035, 12, 2, s + 3) }), pants);
    K.push(loft([{ y: -0.445, rx: 0.044, rz: 0.048 }, { y: -0.462, rx: 0.036, rz: 0.04 }], { seg: 12 }), inside);
    K.flush();
    const foot = new THREE.Group(); foot.position.set(0, -0.465, 0); knee.add(foot);
    const F = new Part(foot);
    const sg = loft([
      { y: -0.08, rx: 0.034, rz: 0.044, cz: 0 }, { y: -0.03, rx: 0.042, rz: 0.05, cz: 0.002 }, { y: 0.05, rx: 0.045, rz: 0.04, cz: 0.012 },
      { y: 0.13, rx: 0.047, rz: 0.03, cz: 0.02 }, { y: 0.2, rx: 0.04, rz: 0.026, cz: 0.024 }, { y: 0.255, rx: 0.02, rz: 0.019, cz: 0.027 }
    ], { seg: 12, capTop: true, capBot: true });
    sg.rotateX(Math.PI / 2); sg.translate(0, -0.012, 0.01);
    F.push(sg, shoe);
    F.box(sole, 0.092, 0.014, 0.33, 0, -0.05, 0.1);
    F.box(sole, 0.07, 0.03, 0.06, 0, -0.035, -0.06);
    F.flush();
    return { leg, knee, foot };
  };
  const L = mkLeg(-1), R = mkLeg(1);
  const legL = L.leg, legR = R.leg;

  /* ===== верх тела ===== */
  const upper = new THREE.Group(); upper.position.set(0, HIP, 0); g.add(upper);
  const T = new Part(upper);
  // таз в брюках и ремень
  T.push(loft([{ y: -0.09, rx: 0.165, rz: 0.1 }, { y: 0.0, rx: 0.165, rz: 0.106 }, { y: 0.09, rx: 0.145, rz: 0.098 }], { seg: 18, wr: folds(0.003, 8, 2, 7) }), pants);
  T.push(loft([{ y: 0.035, rx: 0.152, rz: 0.104 }, { y: 0.065, rx: 0.151, rz: 0.103 }], { seg: 20 }), tie);
  T.box(metalBuckle, 0.04, 0.03, 0.01, 0, 0.05, 0.108);
  // рубашка: мешковатая, на узком торсе; плечи покатые
  const slope = (x, y, z) => { const k = Math.max(0, Math.min(1, (y - 0.52) / 0.15)); return [x, y - 0.5 * k * Math.max(0, Math.abs(x) - 0.05), z]; };
  T.push(loft([
    { y: 0.07, rx: 0.152, rz: 0.108 }, { y: 0.16, rx: 0.142, rz: 0.102, cz: 0.004 }, { y: 0.27, rx: 0.127, rz: 0.092, cz: 0.006 },
    { y: 0.4, rx: 0.138, rz: 0.1, cz: 0.012 }, { y: 0.52, rx: 0.158, rz: 0.104, cz: 0.004 }, { y: 0.6, rx: 0.19, rz: 0.098, cz: -0.006 },
    { y: 0.655, rx: 0.205, rz: 0.082, cz: -0.012 }, { y: 0.69, rx: 0.142, rz: 0.062, cz: -0.004 }, { y: 0.716, rx: 0.072, rz: 0.054, cz: 0.008 },
    { y: 0.73, rx: 0.058, rz: 0.048, cz: 0.012 }
  ], { seg: 26, shape: slope, wr: folds(0.0075, 11, 2.4, 1) }), shirt);
  // складки рубашки у пояса и под рукавами
  for (let k = 0; k < 5; k++) T.box(shirtD, 0.05 + k * 0.01, 0.006, 0.02, -0.07 + k * 0.035, 0.12 + (k % 2) * 0.03, 0.108, 0.1, 0.05 * k, 0.4 - k * 0.2);
  for (const s of [-1, 1]) T.sphere(shirtD, 0.03, s * 0.15, 0.55, 0.045, 0.5, 2.0, 0.6, { w: 8, h: 6, rz: -s * 0.3 });
  T.sphere(shirtD, 0.05, 0.02, 0.3, 0.1, 1.5, 0.35, 0.3, { w: 8, h: 6, rz: 0.2 });
  // планка с пуговицами, карман
  T.box(shirtD, 0.018, 0.5, 0.006, 0, 0.45, 0.107);
  for (let k = 0; k < 5; k++) T.sphere(button, 0.0065, 0.0, 0.19 + k * 0.095, 0.112, 1, 1, 0.5, { w: 6, h: 5 });
  T.box(shirtD, 0.055, 0.06, 0.004, 0.075, 0.5, 0.11, 0, 0, 0.03);
  // воротник — стойка и два острых уголка
  T.push(loft([{ y: 0.722, rx: 0.066, rz: 0.058, cz: 0.012 }, { y: 0.76, rx: 0.07, rz: 0.062, cz: 0.016 }], { seg: 18 }), shirt);
  for (const s of [-1, 1]) T.box(shirt, 0.065, 0.075, 0.006, s * 0.044, 0.745, 0.07, 0.35, -s * 0.45, -s * 0.5);
  // шея: тонкая и длинная, вытянутая вперёд
  T.push(loft([{ y: 0.7, rx: 0.036, rz: 0.038, cz: 0.012 }, { y: 0.78, rx: 0.031, rz: 0.033, cz: 0.04 }, { y: 0.86, rx: 0.029, rz: 0.032, cz: 0.07 }, { y: 0.93, rx: 0.028, rz: 0.03, cz: 0.1 }], { seg: 10 }), skin);
  T.flush();

  /* ===== голова ===== */
  const head = new THREE.Group(); head.position.set(0, 0.99, 0.12); upper.add(head);
  const skull = new THREE.Mesh(headGeoGrin(), headMat); skull.castShadow = true; head.add(skull);
  const H = new Part(head);
  for (const s of [-1, 1]) H.sphere(skin, 0.022, s * 0.093, -0.01, -0.012, 0.35, 1.5, 1, { w: 8, h: 6, rz: -s * 0.15 });   // уши
  buildGrin(H, teeth, teethD, lip);                                                                                      // зубы и губы
  H.flush();
  const mouth = new THREE.Mesh(mouthGeo(), mouthMat); head.add(mouth);                                                   // чёрная пасть
  // тусклые блики в глубине глазниц
  ball(head, eyeMat, 0.0055, -0.037, 0.018, 0.074, 1, 1.15, 0.6, 8, 6);
  ball(head, eyeMat, 0.0055, 0.037, 0.018, 0.074, 1, 1.15, 0.6, 8, 6);

  /* ===== галстук: узел у воротника, длинное остриё ===== */
  const tieG = new THREE.Group(); tieG.position.set(0, 0.7, 0.108); upper.add(tieG);
  {
    const Q = new Part(tieG);
    Q.sphere(tie, 0.021, 0, 0.0, 0.0, 1.15, 0.9, 0.8, { w: 10, h: 8 });
    Q.push(loft([
      { y: -0.012, rx: 0.014, rz: 0.006, cz: 0.012 }, { y: -0.06, rx: 0.022, rz: 0.007, cz: 0.014 }, { y: -0.2, rx: 0.033, rz: 0.008, cz: 0.016 },
      { y: -0.34, rx: 0.04, rz: 0.008, cz: 0.017 }, { y: -0.43, rx: 0.036, rz: 0.007, cz: 0.017 }, { y: -0.475, rx: 0.004, rz: 0.003, cz: 0.017 }
    ], { seg: 8, wr: folds(0.0018, 8, 1.5, 5) }), tie);
    Q.flush();
  }

  /* ===== руки: тонкие, длинные, локти разведены ===== */
  const mkArm = s => {
    const arm = new THREE.Group(); arm.position.set(s * 0.205, 0.625, 0); upper.add(arm);
    const A = new Part(arm);
    A.sphere(shirt, 0.058, 0, 0.0, 0, 1, 0.95, 1, { w: 10, h: 8 });
    A.push(loft([
      { y: 0.02, rx: 0.058, rz: 0.058 }, { y: -0.06, rx: 0.06, rz: 0.06 }, { y: -0.15, rx: 0.066, rz: 0.062 },
      { y: -0.215, rx: 0.074, rz: 0.066, cz: 0.004 }
    ], { seg: 16, wr: folds(0.005, 12, 2, s + 9) }), shirt);                                                                   // короткий мешковатый рукав
    A.push(loft([{ y: -0.2, rx: 0.0735, rz: 0.0655 }, { y: -0.225, rx: 0.0745, rz: 0.0665 }], { seg: 16 }), shirtD);                  // подогнутый край
    A.push(loft([{ y: -0.1, rx: 0.06, rz: 0.056 }, { y: -0.222, rx: 0.07, rz: 0.062 }], { seg: 16 }), inside);                   // тёмное нутро рукава
    A.push(loft([{ y: -0.17, rx: 0.036, rz: 0.038 }, { y: -0.26, rx: 0.036, rz: 0.039 }, { y: -0.36, rx: 0.031, rz: 0.034 }, { y: -0.43, rx: 0.03, rz: 0.032 }], { seg: 10 }), skin);
    A.flush();
    const fore = new THREE.Group(); fore.position.set(0, -0.43, 0); arm.add(fore);
    const F = new Part(fore);
    F.sphere(skinD, 0.034, 0, 0, -0.004, 1, 1, 1, { w: 10, h: 8 });                                                              // локоть
    F.push(loft([
      { y: -0.01, rx: 0.031, rz: 0.033 }, { y: -0.1, rx: 0.034, rz: 0.034 }, { y: -0.24, rx: 0.027, rz: 0.025 }, { y: -0.36, rx: 0.022, rz: 0.02 }, { y: -0.42, rx: 0.021, rz: 0.018 }
    ], { seg: 10 }), skin);
    F.sphere(skinD, 0.022, 0, -0.425, 0, 1, 0.8, 0.9, { w: 8, h: 6 });                                                          // запястье
    F.flush();
    const hand = new THREE.Group(); hand.position.set(0, -0.43, 0); fore.add(hand);
    const Hh = new Part(hand); buildHand(Hh, s, skin, skinD, nail); Hh.flush();
    return { arm, fore, hand };
  };
  const AL = mkArm(-1), AR = mkArm(1);
  const armL = AL.arm, armR = AR.arm;

  g.scale.setScalar(cfg.scale);
  g.userData = {
    eyeMat, upper, head, legL, legR, armL, armR, kind: 'corridor',
    anim(m, amp, chase, time) {
      const off = m.off || 0, ph = m.phase || 0;
      const lean = (chase ? 0.86 : 0.62) + Math.sin(time * 1.3 + off) * 0.035;
      upper.rotation.x = lean;
      upper.rotation.z = Math.sin(ph * 0.5) * 0.06 * amp;
      upper.rotation.y = Math.sin(ph * 0.5 + 1) * 0.1 * amp;
      upper.position.y = HIP + Math.abs(Math.sin(ph * 0.7)) * 0.045 * amp - 0.012;
      // ноги: согнуты в коленях, шаг с подъёмом колена
      const sw = Math.sin(ph * 0.7), cw = Math.cos(ph * 0.7);
      const stride = chase ? 1.0 : 0.8;
      for (const [leg, sgn] of [[L, 1], [R, -1]]) {
        const th = -0.2 + sgn * sw * stride * amp;
        const flex = Math.max(0, -sgn * cw);
        const kn = 0.36 + flex * (chase ? 1.0 : 0.65) * amp + (chase ? 0.18 : 0);
        leg.leg.rotation.x = th - (chase ? 0.12 : 0);
        leg.knee.rotation.x = kn;
        leg.foot.rotation.x = -(leg.leg.rotation.x + kn) + 0.08 * flex * amp;
        leg.leg.rotation.z = sgn * -0.02;
      }
      // руки висят вертикально (компенсируем наклон), локти разведены; при беге болтаются, при ударе — взмах
      const sd = (m.cfg && m.cfg.swing) || 0.22;
      let ax = -lean, bx = -lean;
      const flail = chase ? 0.55 : 0.22;
      ax += -sw * flail * amp + Math.sin(time * 1.7 + off) * 0.03;
      bx += sw * flail * amp + Math.sin(time * 1.7 + off + 2) * 0.03;
      let fa = -0.16 - (chase ? 0.5 : 0) + Math.sin(time * 1.9 + off) * 0.03, fb = fa;
      if (m.swing > 0) {
        const t = 1 - m.swing / sd, v = -lean - 2.3 + t * 2.7;
        ax = v; bx = v - 0.12; fa = fb = -0.1;
      }
      armL.rotation.x = ax; armR.rotation.x = bx;
      AL.fore.rotation.x = fa; AR.fore.rotation.x = fb;
      armL.rotation.z = -0.1 - Math.sin(time * 1.1 + off) * 0.03 - (chase ? 0.2 : 0);
      armR.rotation.z = 0.1 + Math.sin(time * 1.1 + off + 1) * 0.03 + (chase ? 0.2 : 0);
      AL.fore.rotation.z = -0.1 - (chase ? 0.1 : 0); AR.fore.rotation.z = 0.1 + (chase ? 0.1 : 0);
      AL.hand.rotation.z = -0.06; AR.hand.rotation.z = 0.06;
      AL.hand.rotation.x = Math.sin(time * 2.3 + off) * 0.08 - 0.1; AR.hand.rotation.x = Math.sin(time * 2.3 + off + 1.4) * 0.08 - 0.1;
      // галстук висит вертикально и качается
      tieG.rotation.x = -lean * 0.96 + Math.sin(time * 2.1 + off) * 0.05 + sw * 0.12 * amp;
      tieG.rotation.z = Math.sin(time * 1.6 + off) * 0.04 - upper.rotation.z;
      // голова: выброшена вперёд, дёрганая, иногда резко склоняется набок
      const twitch = Math.pow(Math.max(0, Math.sin(time * 0.7 + off * 3)), 24);
      head.rotation.x = -lean * 0.74 + (chase ? 0.14 : 0.04);
      head.rotation.z = Math.sin(time * 9 + off) * (chase ? 0.06 : 0.02) + twitch * 0.55 + 0.1;
      head.rotation.y = chase ? Math.sin(time * 14 + off) * 0.05 : Math.sin(time * 0.5 + off) * 0.45 + twitch * 0.4;
      eyeMat.color.setHex(chase ? 0xf2f4ff : 0x565c6a);
    },
    die(f) {
      g.rotation.x = -f * 1.5;
      upper.rotation.x = 0.5 * (1 - f);
      armL.rotation.z = 0.2 + f * 0.7; armR.rotation.z = -0.2 - f * 0.7;
      armL.rotation.x = armR.rotation.x = -0.5 * f - upper.rotation.x * 0.3;
      L.leg.rotation.x = 0.2 * f; R.leg.rotation.x = -0.15 * f; L.knee.rotation.x = R.knee.rotation.x = 0.1;
      head.rotation.z = f * 0.5;
      tieG.rotation.x = 0;
    }
  };
  return g;
}
