// Frooters-Raum: die Theke von oben, auf Schwarz, mit den vier wichtigsten Produkten und viel Obst zum Spielen
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Produkte laut frooters.de, Fotos: Frooters
const PRODUCTS = [
  { id: 'froyo', img: 'p_froyo', name: 'Frozen Yogurt', k: 'In der Waffelschale', text: 'Leicht und locker aus der Maschine, in der knusprigen Waffelschale. Mit Früchten, Saucen und Toppings ganz nach deiner Wahl.', x: 30, y: 30, w: 900 },
  { id: 'bubble', img: 'p_bubble', name: 'Bubble Waffles', k: 'Frisch gebacken', text: 'Frisch gebackene Waffel, belegt mit Frozen Yogurt, Obst, Sauce und Naschereien. Zum Mitnehmen im roten Frooters-Becher.', x: 1170, y: 60, w: 380 },
  { id: 'muesli', img: 'p_muesli', name: 'Müslibecher', k: 'Zum Löffeln', text: 'Fruchtpüree, frische Erdbeeren und knuspriges Granola im Becher. Für unterwegs oder zum Hinsetzen.', x: 110, y: 430, w: 320 },
  { id: 'smoothies', img: 'p_smoothies', name: 'Smoothies', k: 'Frisch gemixt', text: 'Aus ganzen Früchten gemixt: rot, grün, gelb oder ganz cremig. Jeden Tag frisch.', x: 520, y: 700, w: 1000 },
];
// Hochformat (Handy): Produkte untereinander
const PORTRAIT = { froyo: [40, 30, 920], bubble: [620, 450, 350], muesli: [60, 470, 360], smoothies: [20, 1290, 960] };
const ASPECT = { p_froyo: 1067 / 2600, p_bubble: 525 / 639, p_muesli: 2848 / 1600, p_smoothies: 650 / 2600 };

export async function createTheke(root, { mobile = false, rec = false } = {}) {
  const el = document.createElement('div'); el.className = 'tk';
  el.innerHTML = `<div class="tk-bg"></div><div class="tk-board"></div><canvas class="tk-fruit"></canvas><div class="tk-light"></div>
    <div class="tk-card"><p class="tk-k"></p><h3></h3><p class="tk-t"></p></div>`;
  root.prepend(el);
  const board = el.querySelector('.tk-board'), card = el.querySelector('.tk-card'), light = el.querySelector('.tk-light');
  for (const p of PRODUCTS) {
    const d = document.createElement('div'); d.className = 'tk-item'; d.dataset.id = p.id;
    Object.assign(d.style, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.w * ASPECT[p.img] + 'px', backgroundImage: `url(assets/img/frooters/${p.img}.webp)` });
    d.innerHTML = `<span class="tk-pin">${p.name}</span>`;
    d.addEventListener('pointerenter', () => { board.classList.add('hov'); d.classList.add('on'); card.querySelector('.tk-k').textContent = p.k; card.querySelector('h3').textContent = p.name; card.querySelector('.tk-t').textContent = p.text; card.classList.add('on'); });
    d.addEventListener('pointerleave', () => { board.classList.remove('hov'); d.classList.remove('on'); card.classList.remove('on'); });
    board.appendChild(d);
  }
  // Brett (1600 × 1000) füllt den Raum
  let W = 1, H = 1, S = 1, BW = 1600, BH = 1000, portrait = null;
  const items = [...board.children];
  function layout() {
    W = el.clientWidth; H = el.clientHeight; const pt = H > W * 1.05;
    if (pt !== portrait) { portrait = pt; BW = pt ? 1000 : 1600; BH = pt ? 1600 : 1000; board.style.width = BW + 'px'; board.style.height = BH + 'px';
      PRODUCTS.forEach((p, i) => { const [x, y, w] = pt ? PORTRAIT[p.id] : [p.x, p.y, p.w]; Object.assign(items[i].style, { left: x + 'px', top: y + 'px', width: w + 'px', height: w * ASPECT[p.img] + 'px' }); p.cx = x; p.cy = y; p.cw = w; }); }
    S = Math.max(W / BW, H / BH); board.style.transform = `translate(-50%,-50%) scale(${S})`;
  }

  // --- Obst in 3D, von oben ---
  const canvas = el.querySelector('.tk-fruit');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: rec });
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -3000, 3000); cam.up.set(0, 0, -1);
  const sun = new THREE.DirectionalLight('#fff2e2', 2.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 9; sun.shadow.blurSamples = 16;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#ffffff', '#1a1a1a', 0.55));
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.6 })); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
  let lw = 0, lh = 0;
  function fitGL() {
    layout(); if (W === lw && H === lh) return; const sx = lw ? W / lw : 1, sy = lh ? H / lh : 1; lw = W; lh = H;
    r.setSize(W, H, false); cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix(); cam.position.set(0, 1500, 0); cam.lookAt(0, 0, 0);
    catcher.scale.set(W * 3, H * 3, 1); catcher.position.set(W / 2, 0, H / 2);
    sun.target.position.set(W / 2, 0, H / 2); sun.position.set(W / 2 - W * .3, Math.max(W, H), H / 2 - H * .35);
    const c = sun.shadow.camera; const R = Math.max(W, H); Object.assign(c, { left: -R, right: R, top: R, bottom: -R, near: 1, far: R * 4 }); c.updateProjectionMatrix();
    for (const b of bodies) { b.x *= sx; b.y *= sy; }
    unit = Math.sqrt(W * H) / 1150;
  }
  let unit = 1;
  const bodies = [];
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const env = await new RGBELoader().loadAsync('assets/hdri/brown_photostudio_02_1k.hdr'); env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 0.85;
  const models = {};
  for (const id of ['food_kiwi_01', 'lemon', 'food_lime_01', 'food_pomegranate_01', 'food_apple_01', 'food_lychee_01', 'food_pears_asian_01']) models[id] = (await loader.loadAsync(`assets/models/${id}.glb`)).scene;
  const P = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .35, clearcoat: o.cc ?? .5, clearcoatRoughness: .3, sheen: o.sh ?? 0, sheenColor: new THREE.Color(o.shc ?? '#fff') });
  const strawberry = () => {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * (0.36 + .12 * (1 - t)), t * .9)); }
    const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), P('#c80f28', { r: .28, cc: .7 })); g.add(body);
    const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(.022, 6, 4), P('#f0cf55'), 50), m4 = new THREE.Matrix4();
    for (let i = 0; i < 50; i++) { const t = .1 + Math.random() * .85, a = Math.random() * 6.28, rr = Math.sin(t * Math.PI) * (0.36 + .12 * (1 - t)); m4.setPosition(Math.cos(a) * rr, t * .9, Math.sin(a) * rr); seeds.setMatrixAt(i, m4); } g.add(seeds);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.34, .12, 8), P('#3d8a28', { r: .6, cc: 0 })); leaf.position.y = .92; g.add(leaf);
    g.rotation.z = Math.PI / 2; const o = new THREE.Group(); o.add(g); return o;
  };
  const berry = (c, s, sh) => new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), P(c, { r: .3, sh, shc: '#c9d2ff' }));
  const rasp = () => { const g = new THREE.Group(); for (let i = 0; i < 22; i++) { const a = i * 2.4, t = i / 22, rr = Math.sin(t * Math.PI * .9 + .2) * .4; const s = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), P('#d4305a', { r: .25, cc: .6 })); s.position.set(Math.cos(a) * rr, t * .8 - .4, Math.sin(a) * rr); g.add(s); } return g; };
  // Durchmesser bei 1500 px Breite
  const SET = [
    ['food_pomegranate_01', 76, 2], ['food_apple_01', 70, 3], ['food_pears_asian_01', 70, 2], ['food_kiwi_01', 60, 4], ['lemon', 62, 2], ['food_lime_01', 54, 3], ['food_lychee_01', 40, 4],
    ['strawberry', 46, 9], ['rasp', 30, 7], ['blue', 21, mobile ? 14 : 26],
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  layout(); fitGL();
  for (const [id, dia, n] of SET) for (let k = 0; k < n; k++) {
    let o;
    if (models[id]) { o = models[id].clone(true); o.traverse(m => { if (m.isMesh) m.castShadow = true; }); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.position.sub(b.getCenter(new THREE.Vector3())); const g = new THREE.Group(); g.add(o); g.userData.k = 1 / Math.max(s.x, s.y, s.z); o = g; }
    else { o = id === 'strawberry' ? strawberry() : id === 'rasp' ? rasp() : berry('#2b3266', 1, .9); o.traverse(m => { if (m.isMesh) m.castShadow = true; }); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.userData.k = 1 / Math.max(s.x, s.y, s.z); }
    o.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); scene.add(o);
    // Streuen: lieber in die Lücken zwischen den Produkten
    let x, y, tries = 0; do { x = rnd(.04, .96) * W; y = rnd(.06, .94) * H; tries++; } while (tries < 20 && overProduct(x, y));
    bodies.push({ o, dia, x, y, vx: 0, vy: 0 });
  }
  function overProduct(x, y) {
    for (const p of PRODUCTS) { const bx = W / 2 + (p.cx - BW / 2) * S, by = H / 2 + (p.cy - BH / 2) * S, bw = p.cw * S, bh = p.cw * ASPECT[p.img] * S; if (x > bx + bw * .15 && x < bx + bw * .85 && y > by + bh * .15 && y < by + bh * .85) return true; }
    return false;
  }
  // Maus
  const ptr = { x: -9999, y: -9999, px: -9999, py: -9999, in: false };
  addEventListener('pointermove', e => { const b = el.getBoundingClientRect(), k = el.clientWidth / Math.max(1, b.width); ptr.x = (e.clientX - b.left) * k; ptr.y = (e.clientY - b.top) * k; ptr.in = ptr.x > 0 && ptr.y > 0 && ptr.x < el.clientWidth && ptr.y < el.clientHeight; light.style.setProperty('--lx', ptr.x + 'px'); light.style.setProperty('--ly', ptr.y + 'px'); board.style.setProperty('--px', `${(ptr.x / Math.max(1, el.clientWidth) - .5) * -16}px`); board.style.setProperty('--py', `${(ptr.y / Math.max(1, el.clientHeight) - .5) * -10}px`); }, { passive: true });
  const q = new THREE.Quaternion(), ax = new THREE.Vector3();
  let visible = true;
  return {
    el,
    setVisible(v) { visible = v; },
    update(dt) {
      if (!visible) return;
      fitGL();
      const pvx = (ptr.x - ptr.px) / Math.max(dt, 1e-3), pvy = (ptr.y - ptr.py) / Math.max(dt, 1e-3); ptr.px = ptr.x; ptr.py = ptr.y;
      const R = 30 * unit;
      for (const b of bodies) {
        const rad = b.dia * unit / 2; b.rad = rad;
        if (!ptr.in) continue;
        const dx = b.x - ptr.x, dy = b.y - ptr.y, d = Math.hypot(dx, dy), min = rad + R;
        if (d < min && d > .01) { const nx = dx / d, ny = dy / d; b.x += nx * (min - d) * .5; b.y += ny * (min - d) * .5; const push = Math.max(0, pvx * nx + pvy * ny); b.vx += nx * (push * .28 + 30 * unit); b.vy += ny * (push * .28 + 30 * unit); }
      }
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], c = bodies[j], dx = a.x - c.x, dy = a.y - c.y, min = a.rad + c.rad; if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        const d = Math.hypot(dx, dy); if (d < min && d > .01) { const nx = dx / d, ny = dy / d, p = (min - d) / 2; a.x += nx * p; a.y += ny * p; c.x -= nx * p; c.y -= ny * p; const rv = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny; if (rv < 0) { const imp = -rv * .5; a.vx += nx * imp; a.vy += ny * imp; c.vx -= nx * imp; c.vy -= ny * imp; } }
      }
      const maxV = 520 * unit;
      for (const b of bodies) {
        b.vx *= Math.exp(-dt * 3.6); b.vy *= Math.exp(-dt * 3.6);
        const sp = Math.hypot(b.vx, b.vy); if (sp > maxV) { b.vx *= maxV / sp; b.vy *= maxV / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.rad) { b.x = b.rad; b.vx = Math.abs(b.vx) * .4; } if (b.x > W - b.rad) { b.x = W - b.rad; b.vx = -Math.abs(b.vx) * .4; }
        if (b.y < b.rad) { b.y = b.rad; b.vy = Math.abs(b.vy) * .4; } if (b.y > H - b.rad) { b.y = H - b.rad; b.vy = -Math.abs(b.vy) * .4; }
        const roll = Math.hypot(b.vx, b.vy) * dt / Math.max(b.rad, 1); if (roll > 1e-4) { ax.set(b.vy, 0, -b.vx).normalize(); q.setFromAxisAngle(ax, roll); b.o.quaternion.premultiply(q); }
        b.o.scale.setScalar(b.dia * unit * b.o.userData.k); b.o.position.set(b.x, b.rad, b.y);
      }
      r.render(scene, cam);
    }
  };
}
