// Frooters: echtes Obst in 3D, von oben gesehen, auf der ganzen Theke verteilt. Rollt weg, wenn man es anschubst.
// Die Welt ist so lang wie die Theke (u), quer dazu liegt v. Gezeichnet wird nur der sichtbare Ausschnitt.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createFruitWorld(canvas, { mobile = false, rec = false, vertical = false } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, preserveDrawingBuffer: rec, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7; pm.dispose();
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -3000, 3000); cam.up.set(0, 0, -1);
  const sun = new THREE.DirectionalLight('#fff2e2', 2.6); sun.castShadow = true; const SM = mobile ? 1024 : 2048; sun.shadow.mapSize.set(SM, SM); sun.shadow.radius = mobile ? 6 : 9; sun.shadow.blurSamples = mobile ? 8 : 16;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#ffffff', '#1a1a1a', 0.5));
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.6 })); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);

  let W = 1, H = 1, L = 1, A = 1, unit = 1, off = 0, zones = null, laid = false;
  const bodies = [], waiting = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const P = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .35, clearcoat: o.cc ?? .5, clearcoatRoughness: .3, sheen: o.sh ?? 0, sheenColor: new THREE.Color(o.shc ?? '#fff') });
  // Erdbeere: Herzform, glänzend rot, zur Schulter hin heller, eingesunkene gelbe Nüsschen, grüner Kelch mit Blättern
  const SB = (() => {
    const N = 40, pts = [];
    const R = t => .46 * Math.pow(Math.sin(Math.min(1, t * 1.08) * Math.PI * .5), .62) * (1 - .55 * Math.pow(Math.max(0, t - .86) / .14, 2));
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new THREE.Vector2(Math.max(.0005, R(t)), t * 1.02)); }
    const geo = new THREE.LatheGeometry(pts, 40), pos = geo.attributes.position, col = [], c = new THREE.Color();
    const red = new THREE.Color('#a80a18'), hi = new THREE.Color('#d8222a'), sh = new THREE.Color('#e45a3c');
    const seedsAt = []; const NS = 70;
    for (let i = 0; i < NS; i++) { const t = .07 + .8 * (i + .5) / NS, a = i * 2.39996; seedsAt.push([t, a]); }
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), t = y / 1.02, x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x);
      // Dellen um jedes Nüsschen
      let dent = 0; for (const [st, sa] of seedsAt) { const dt = (t - st) * 6, da = Math.atan2(Math.sin(a - sa), Math.cos(a - sa)) * R(st) * 1.1; const d2 = (dt * dt + da * da * 36) ; if (d2 < .5) dent = Math.max(dent, 1 - d2 / .5); }
      const r = Math.hypot(x, z), k = r > 1e-4 ? (r - dent * .018) / r : 1; pos.setX(i, x * k); pos.setZ(i, z * k);
      c.copy(red).lerp(hi, Math.min(1, Math.max(0, (t - .5) / .35)) * .6); if (t > .9) c.lerp(sh, Math.min(1, (t - .9) / .1) * .45); c.multiplyScalar(1 - dent * .25); col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const body = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .26, clearcoat: 1, clearcoatRoughness: .12, sheen: .2, sheenColor: new THREE.Color('#ff9a8a') });
    const seedGeo = new THREE.SphereGeometry(1, 8, 6); seedGeo.scale(.013, .022, .013);
    const seedMat = new THREE.MeshStandardMaterial({ color: '#c99a2e', roughness: .55 });
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.1, .16, 0, .38); leaf.quadraticCurveTo(-.1, .16, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leaf, 6), leafMat = new THREE.MeshStandardMaterial({ color: '#2f7420', roughness: .6, side: THREE.DoubleSide });
    return { geo, body, seedGeo, seedMat, seedsAt, R, leafGeo, leafMat };
  })();
  const strawberry = () => {
    const g = new THREE.Group(); g.add(new THREE.Mesh(SB.geo, SB.body));
    const seeds = new THREE.InstancedMesh(SB.seedGeo, SB.seedMat, SB.seedsAt.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    SB.seedsAt.forEach(([t, a], i) => { const r = SB.R(t) - .016, p = new THREE.Vector3(Math.cos(a) * r, t * 1.02, Math.sin(a) * r); n.set(Math.cos(a), .35, Math.sin(a)).normalize(); q.setFromUnitVectors(up, n); m4.compose(p, q, one); seeds.setMatrixAt(i, m4); });
    g.add(seeds);
    const cal = new THREE.Group(); cal.position.y = .99;
    for (let i = 0; i < 10; i++) { const l = new THREE.Mesh(SB.leafGeo, SB.leafMat); const piv = new THREE.Group(); piv.rotation.y = i / 10 * Math.PI * 2 + Math.random() * .3; l.rotation.x = -Math.PI / 2 + .18 + Math.random() * .2; piv.add(l); cal.add(piv); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.022, .03, .14, 6), SB.leafMat); stem.position.y = .07; cal.add(stem); g.add(cal);
    g.rotation.z = Math.PI / 2; const o = new THREE.Group(); o.add(g); return o;
  };
  const blue = () => new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), P('#1c2148', { r: .42, cc: .25, sh: .45, shc: '#8f9bd8' }));
  const rasp = () => { const g = new THREE.Group(), geo = new THREE.SphereGeometry(.17, 10, 8), mat = P('#c01f45', { r: .3, cc: .6 }); for (let i = 0; i < 22; i++) { const a = i * 2.4, t = i / 22, rr = Math.sin(t * Math.PI * .9 + .2) * .4; const s = new THREE.Mesh(geo, mat); s.position.set(Math.cos(a) * rr, t * .8 - .4, Math.sin(a) * rr); g.add(s); } return g; };
  // [Art, Durchmesser bei 1000 px Thekenbreite, Anzahl Computer, Anzahl Handy]
  const SET = { food_pomegranate_01: [112, 3, 2], food_apple_01: [100, 5, 3], food_pears_asian_01: [102, 3, 2], food_kiwi_01: [78, 5, 3], lemon: [88, 3, 2], food_lime_01: [74, 4, 2], food_lychee_01: [52, 5, 3], strawberry: [64, 9, 6], rasp: [40, 7, 4], blue: [27, 14, 8] };

  function place(b) {
    let u, v, z = zones && zones.length ? zones[Math.floor(Math.random() * zones.length)] : [0, L];
    u = rnd(z[0], z[1]); v = rnd(.1, .9) * A; b.u = u; b.v = v;
  }
  function add(id, make) {
    const [dia, nd, nm] = SET[id];
    for (let k = 0; k < (mobile ? nm : nd); k++) {
      let o = make(); o.traverse(m => { if (m.isMesh) m.castShadow = true; });
      const box = new THREE.Box3().setFromObject(o), s = box.getSize(new THREE.Vector3());
      if (id.startsWith('food') || id === 'lemon') { o.position.sub(box.getCenter(new THREE.Vector3())); const g = new THREE.Group(); g.add(o); o = g; }
      o.userData.k = 1 / Math.max(s.x, s.y, s.z); o.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); o.visible = false; scene.add(o);
      const b = { o, dia, u: 0, v: 0, vu: 0, vv: 0, rad: 1 }; if (laid) place(b); else waiting.push(b); bodies.push(b);
    }
  }
  add('strawberry', strawberry); add('rasp', rasp); add('blue', blue);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const want = mobile ? ['food_apple_01', 'food_kiwi_01', 'food_lime_01', 'lemon'] : Object.keys(SET).filter(k => k.startsWith('food') || k === 'lemon');
  const loaded = Promise.all(want.map(id => loader.loadAsync(`assets/m2/${id}.glb`).then(g => add(id, () => g.scene.clone(true))).catch(() => {})));

  // Zeiger in Bildschirm-Koordinaten der Leinwand
  const ptr = { x: -9999, y: -9999, wu: null, wv: null, live: false };
  const setPtr = (cx, cy) => { const b = canvas.getBoundingClientRect(); ptr.x = cx - b.left; ptr.y = cy - b.top; ptr.live = ptr.x > -40 && ptr.y > -40 && ptr.x < b.width + 40 && ptr.y < b.height + 40; };
  addEventListener('pointermove', e => setPtr(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) setPtr(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchend', () => { ptr.live = false; ptr.wu = null; }, { passive: true });
  const q = new THREE.Quaternion(), ax = new THREE.Vector3();
  let fr = 0;

  return {
    loaded, bodies,
    // L: Länge der Theke, A: Breite quer dazu, z: Bereiche [von, bis] entlang der Theke, in denen Obst liegen darf
    layout(l, a, z) {
      const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      if (w !== W || h !== H) {
        W = w; H = h; r.setSize(W, H, false); cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix(); cam.position.set(0, 1500, 0); cam.lookAt(0, 0, 0);
        catcher.scale.set(W * 3, H * 3, 1); catcher.position.set(W / 2, 0, H / 2);
        sun.target.position.set(W / 2, 0, H / 2); sun.position.set(W / 2 - W * .3, Math.max(W, H), H / 2 - H * .35);
        const c = sun.shadow.camera, R = Math.max(W, H); Object.assign(c, { left: -R, right: R, top: R, bottom: -R, near: 1, far: R * 4 }); c.updateProjectionMatrix();
      }
      if (laid && (l !== L || a !== A)) for (const b of bodies) { b.u *= l / L; b.v *= a / A; }
      L = l; A = a; zones = z; unit = vertical ? A / 520 : A / 1000;
      if (!laid) { laid = true; for (const b of waiting) place(b); waiting.length = 0; }
    },
    setOffset(o) { off = o; },
    nudge(k = 1) { for (const b of bodies) { b.vu += rnd(-1, 1) * 120 * k; b.vv += rnd(-1, 1) * 120 * k; } },
    update(dt) {
      if (!laid) return;
      // Zeiger in Weltkoordinaten; auch das Vorbeischieben der Theke schubst das Obst
      let pvu = 0, pvv = 0, pu = null, pv = null;
      if (ptr.live) {
        pu = (vertical ? ptr.y : ptr.x) + off; pv = vertical ? ptr.x : ptr.y;
        if (ptr.wu !== null) { pvu = (pu - ptr.wu) / Math.max(dt, 1e-3); pvv = (pv - ptr.wv) / Math.max(dt, 1e-3); const m = Math.hypot(pvu, pvv), cap = 2600; if (m > cap) { pvu *= cap / m; pvv *= cap / m; } }
        ptr.wu = pu; ptr.wv = pv;
      } else ptr.wu = null;
      const R = 34 * unit;
      for (const b of bodies) {
        b.rad = b.dia * unit / 2;
        if (pu === null) continue;
        const du = b.u - pu, dv = b.v - pv, d = Math.hypot(du, dv), min = b.rad + R;
        if (d < min && d > .01) { const nu = du / d, nv = dv / d; b.u += nu * (min - d) * .5; b.v += nv * (min - d) * .5; const push = Math.max(0, pvu * nu + pvv * nv); b.vu += nu * (push * .3 + 36 * unit); b.vv += nv * (push * .3 + 36 * unit); }
      }
      const lo = off - 300, hi = off + (vertical ? H : W) + 300;
      for (let i = 0; i < bodies.length; i++) { const a = bodies[i]; if (a.u < lo || a.u > hi) continue; for (let j = i + 1; j < bodies.length; j++) {
        const c = bodies[j], du = a.u - c.u, dv = a.v - c.v, min = a.rad + c.rad; if (Math.abs(du) > min || Math.abs(dv) > min) continue;
        const d = Math.hypot(du, dv); if (d < min && d > .01) { const nu = du / d, nv = dv / d, p = (min - d) / 2; a.u += nu * p; a.v += nv * p; c.u -= nu * p; c.v -= nv * p; const rv = (a.vu - c.vu) * nu + (a.vv - c.vv) * nv; if (rv < 0) { a.vu -= rv * nu * .8; a.vv -= rv * nv * .8; c.vu += rv * nu * .8; c.vv += rv * nv * .8; } }
      } }
      const maxV = 560 * unit, damp = Math.exp(-dt * 3.4);
      for (const b of bodies) {
        b.vu *= damp; b.vv *= damp; const sp = Math.hypot(b.vu, b.vv); if (sp > maxV) { b.vu *= maxV / sp; b.vv *= maxV / sp; }
        b.u += b.vu * dt; b.v += b.vv * dt;
        if (b.u < b.rad) { b.u = b.rad; b.vu = Math.abs(b.vu) * .4; } if (b.u > L - b.rad) { b.u = L - b.rad; b.vu = -Math.abs(b.vu) * .4; }
        if (b.v < b.rad) { b.v = b.rad; b.vv = Math.abs(b.vv) * .4; } if (b.v > A - b.rad) { b.v = A - b.rad; b.vv = -Math.abs(b.vv) * .4; }
        const sx = vertical ? b.v : b.u - off, sy = vertical ? b.u - off : b.v, vx = vertical ? b.vv : b.vu, vy = vertical ? b.vu : b.vv;
        const on = sx > -b.rad * 2 && sx < W + b.rad * 2 && sy > -b.rad * 2 && sy < H + b.rad * 2; b.o.visible = on; if (!on) continue;
        const roll = Math.hypot(vx, vy) * dt / Math.max(b.rad, 1); if (roll > 1e-4) { ax.set(vy, 0, -vx).normalize(); q.setFromAxisAngle(ax, roll); b.o.quaternion.premultiply(q); }
        b.o.scale.setScalar(b.dia * unit * b.o.userData.k); b.o.position.set(sx, b.rad, sy);
      }
      if (mobile) { r.shadowMap.autoUpdate = false; if ((fr = (fr + 1) % 2) === 0) r.shadowMap.needsUpdate = true; }
      r.render(scene, cam);
    }
  };
}
