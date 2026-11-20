// Frooters-Genusswelt: die Reise der Açaí. Echter Regenwald als Rundumbild, davor die Rispe mit ihren Beeren.
// Beim Scrollen: Blick in die Krone, Ernte (Beeren fallen), eine Beere ganz groß, dann die Bowl.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { $, $$, REC, reduced, mobile, clamp, range, ease, prog, vis, onTick, scrollToY } from './common.js?v=20261120203725';

const reise = $('#reise'), canvas = $('#wald');
const stations = $$('.j-st'), power = $('#jPower'), powLis = $$('#jPower li'), final = $('#jFinal'), bowl = $('.j-bowl'), glow = $('.j-glow'), rail = $$('#jRail button');
const key = (p, pts) => { if (p <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (p <= pts[i][0]) { const [p0, v0] = pts[i - 1], [p1, v1] = pts[i]; return v0 + (v1 - v0) * ease((p - p0) / (p1 - p0)); } return pts[pts.length - 1][1]; };
const PITCH = [[0, 58], [.1, 55], [.2, 13], [.33, 13], [.4, 40], [.5, 33], [.6, 6], [.82, 6], [.9, -9], [1, -11]];
const YAW = [[0, -3], [.2, 9], [.33, 9], [.42, -2], [.6, -7], [.82, -7], [.92, 0]];
const BLUR = [[0, 0], [.55, 0], [.62, .92], [.83, .92], [.9, 1]];
const DARK = [[0, .1], [.1, .1], [.18, .3], [.55, .3], [.62, .42], [.84, .42], [.92, .58]];
const H0 = .37;                         // ab hier wird geerntet

let ok = true, r;
try { r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, preserveDrawingBuffer: REC, powerPreference: 'high-performance' }); } catch (e) { ok = false; }
const ready = [];
if (ok) {
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, .05, 200); cam.rotation.order = 'YXZ'; scene.add(cam);

  // Wald: Ausschnitt des Rundumbilds auf der Innenseite einer Kugel
  const D = Math.PI / 180, geo = new THREE.SphereGeometry(60, 48, 40, 204 * D, 132 * D, 0, 135 * D); geo.scale(-1, 1, 1);
  const tl = new THREE.TextureLoader(), tex = t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const uni = { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uBlur: { value: 0 }, uDark: { value: .1 } }, uniR = { tR: { value: null }, uDark: uni.uDark };
  // rundherum das ganze Bild in klein, davor der scharfe Ausschnitt mit weichen Rändern
  const rund = new THREE.Mesh(new THREE.SphereGeometry(62, 40, 24).scale(-1, 1, 1), new THREE.ShaderMaterial({ uniforms: uniR, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D tR; uniform float uDark; varying vec2 vUv; void main(){ vec3 c = texture2D(tR, vUv).rgb; c = mix(c, c * vec3(.62, .5, .78), uDark) * (1. - uDark * .55); gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }` }));
  rund.renderOrder = -2; scene.add(rund);
  const wald = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: uni, depthWrite: false, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uBlur, uDark; varying vec2 vUv;
      void main(){ vec3 b = texture2D(tB, vUv).rgb, a = texture2D(tA, vUv).rgb; vec3 c = mix(mix(b, a, uMix), b, uBlur);
        c = mix(c, c * vec3(.62, .5, .78), uDark) * (1. - uDark * .55);
        float al = smoothstep(0., .07, vUv.x) * smoothstep(1., .93, vUv.x) * smoothstep(0., .06, vUv.y);
        gl_FragColor = vec4(c, al);
        #include <colorspace_fragment>
      }` }));
  wald.renderOrder = -1; scene.add(wald);
  ready.push(tl.loadAsync('assets/img/bowlers/wald-rund.webp').then(t => { uniR.tR.value = tex(t); }));
  ready.push(tl.loadAsync('assets/img/bowlers/wald-unscharf.webp').then(t => { uni.tB.value = tex(t); if (!uni.tA.value) uni.tA.value = t; canvas.classList.add('on'); }));
  let sharpAt = -1;
  tl.loadAsync(`assets/img/bowlers/wald-${mobile ? 'm' : 'd'}.webp`).then(t => { uni.tA.value = tex(t); sharpAt = 0; });
  ready.push(tl.loadAsync('assets/img/bowlers/licht.jpg').then(t => { t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromEquirectangular(t).texture; scene.environmentIntensity = 1.5; pm.dispose(); t.dispose(); }));
  const sun = new THREE.DirectionalLight('#fff3d6', 2.4); sun.position.set(-2, 5, 1.5); scene.add(sun, new THREE.HemisphereLight('#e4f0ff', '#27331a', .8));

  // Die Rispe: viele dünne Stränge, daran die Beeren
  let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };
  const NS = mobile ? 26 : 38, PER = mobile ? 20 : 26, N = NS * PER;
  const bunch = new THREE.Group(); bunch.position.set(-.12, 2.72, -1.55); scene.add(bunch);
  const tubes = [], bx = new Float32Array(N), by = new Float32Array(N), bz = new Float32Array(N), bs = new Float32Array(N), bk = new Float32Array(N), bd = new Float32Array(N * 2), bp = new Float32Array(N);
  let n = 0, minY = 0;
  for (let s = 0; s < NS; s++) {
    const az = s * 2.399 + rnd(-.2, .2), R = rnd(.13, .46), L = rnd(.72, 1.1), y0 = -rnd(0, .26), pts = [];
    const at = t => new THREE.Vector3(Math.cos(az) * R * (1 - Math.exp(-3.2 * t)), y0 - L * Math.pow(t, 1.25), Math.sin(az) * R * (1 - Math.exp(-3.2 * t)));
    for (let i = 0; i <= 10; i++) pts.push(at(i / 10));
    tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, .0048, 5));
    for (let i = 0; i < PER; i++) { const t = .16 + .84 * (i + rnd(0, .8)) / PER, p = at(Math.min(1, t)), a = rnd(0, 6.28), o = rnd(.012, .022); bx[n] = p.x + Math.cos(a) * o; by[n] = p.y + rnd(-.008, .008); bz[n] = p.z + Math.sin(a) * o; bs[n] = rnd(.017, .024); bd[n * 2] = rnd(-.25, .25); bd[n * 2 + 1] = rnd(-.2, .3); bp[n] = rnd(0, 6.28); minY = Math.min(minY, by[n]); n++; }
  }
  for (let i = 0; i < N; i++) bk[i] = clamp(1 - (by[i] / minY) * .75 + rnd(-.12, .12));   // unten hängende Beeren fallen zuerst
  tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.3, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.3, .9, .35), new THREE.Vector3(-1.1, 2.4, 1.3)]), 20, .028, 8));
  bunch.add(new THREE.Mesh(mergeGeometries(tubes), new THREE.MeshStandardMaterial({ color: '#5c6731', roughness: .8 })));
  const skin = (o = {}) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .34, clearcoat: .75, clearcoatRoughness: .26, sheen: .5, sheenColor: new THREE.Color('#7c55b4'), sheenRoughness: .5, ...o });
  const berries = new THREE.InstancedMesh(new THREE.SphereGeometry(1, mobile ? 8 : 12, mobile ? 6 : 9), skin(), N), M = new THREE.Matrix4(), C = new THREE.Color();
  for (let i = 0; i < N; i++) { const u = rnd(); C.set(u < .04 ? '#4a6a2c' : u < .12 ? '#5a1c36' : '#190c24').multiplyScalar(rnd(.8, 1.15)); berries.setColorAt(i, C); }
  berries.frustumCulled = false; bunch.add(berries);
  function place(p, t) {
    const q0 = p - H0; let any = false;
    for (let i = 0; i < N; i++) {
      const q = q0 - bk[i] * .15; let x = bx[i], y = by[i], z = bz[i];
      if (q > 0) { const f = 60 * Math.pow(q, 1.6); y -= f; x += bd[i * 2] * f * .16 + Math.sin(t * 2 + bp[i]) * .01 * Math.min(1, f); z += bd[i * 2 + 1] * f * .16; any = true; }
      else { x += Math.sin(t * .9 + bp[i]) * .0025; }
      M.makeScale(bs[i], bs[i] * .96, bs[i]); M.setPosition(x, y, z); berries.setMatrixAt(i, M);
    }
    berries.instanceMatrix.needsUpdate = true; return any;
  }
  place(0, 0);

  // Die eine Beere, ganz groß (hängt an der Kamera)
  const nc = document.createElement('canvas'); nc.width = nc.height = 256; const ng = nc.getContext('2d'); ng.fillStyle = '#808080'; ng.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = 96 + Math.random() * 64 | 0; ng.fillStyle = `rgba(${v},${v},${v},.5)`; ng.beginPath(); ng.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.2 + .4, 0, 6.3); ng.fill(); }
  const bump = new THREE.CanvasTexture(nc); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(3, 2);
  const star = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshPhysicalMaterial({ color: '#27103c', roughness: .5, clearcoat: .4, clearcoatRoughness: .35, sheen: .9, sheenColor: new THREE.Color('#8f76cf'), sheenRoughness: .34, bumpMap: bump, bumpScale: 1.4, envMapIntensity: .8 }));
  const rim = new THREE.PointLight('#c9a2ff', 1.1, 3), keyL = new THREE.PointLight('#fff1dc', .9, 3); rim.position.set(-.55, .25, -.25); keyL.position.set(.45, .5, -.05); cam.add(rim, keyL);
  const crown = new THREE.Mesh(new THREE.CircleGeometry(.16, 24), new THREE.MeshStandardMaterial({ color: '#0d0612', roughness: .9 })); crown.position.set(0, .985, 0); crown.rotation.x = -Math.PI / 2; star.add(crown);
  star.scale.setScalar(.085); star.visible = false; cam.add(star);
  // Beeren, die am Ende in die Bowl regnen (hängen an der Kamera)
  const NR = mobile ? 30 : 54, rain = new THREE.InstancedMesh(berries.geometry, skin({ color: '#1b0d27' }), NR), rr = Array.from({ length: NR }, () => ({ x: rnd(-.55, .55), z: -rnd(.45, 1.7), s: rnd(.014, .03), d: rnd(0, .1), w: rnd(0, 6.28) }));
  rain.frustumCulled = false; rain.visible = false; cam.add(rain);

  let W = 0, H = 0, portrait = false;
  function fit() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h || (w === W && h === H)) return; W = w; H = h; portrait = h > w; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = portrait ? 74 : 55; cam.updateProjectionMatrix(); }
  let mx = 0, my = 0, sx = 0, sy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  let lastP = -1, falling = true;
  onTick((dt, t) => {
    if (!vis(reise, 100)) return;
    fit(); const p = prog(reise);
    if (sharpAt >= 0 && uni.uMix.value < 1) { sharpAt += dt; uni.uMix.value = Math.min(1, sharpAt / .9); }
    sx += (mx - sx) * (1 - Math.exp(-dt * 4)); sy += (my - sy) * (1 - Math.exp(-dt * 4));
    cam.rotation.x = (key(p, PITCH) - sy * 3 + Math.sin(t * .35) * .5) * D; cam.rotation.y = -(key(p, YAW) + sx * 6 + Math.sin(t * .27) * .7) * D;
    uni.uBlur.value = key(p, BLUR); uni.uDark.value = key(p, DARK);
    // Rispe und Ernte
    bunch.visible = p < .74; if (bunch.visible) { bunch.rotation.z = Math.sin(t * .6) * .02; bunch.rotation.x = Math.sin(t * .47) * .016; if (falling || p !== lastP) falling = place(p, t); }
    // die große Beere: fällt herein, bleibt stehen, fällt später in die Bowl
    const inn = range(p, .565, .64), out = range(p, .835, .9); star.visible = inn > 0 && out < 1; rim.visible = keyL.visible = star.visible;
    if (star.visible) { const e = 1 - Math.pow(1 - inn, 3), ov = Math.sin(inn * Math.PI) * .03 * (1 - inn); const yT = portrait ? .085 : 0; star.position.set(0, yT + (1 - e) * .5 - ov - out * out * .75, -.42); star.rotation.set(.25 + Math.sin(t * .4) * .08, t * .22, .12); star.scale.setScalar(.085 * (portrait ? .78 : 1)); }
    // Regen in die Bowl
    const rp = range(p, .84, .99); rain.visible = rp > 0 && rp < 1;
    if (rain.visible) { for (let i = 0; i < NR; i++) { const o = rr[i], q = clamp((rp - o.d) / .62); M.makeScale(o.s, o.s * .96, o.s); M.setPosition(o.x + Math.sin(t + o.w) * .01, 1.0 - q * q * 2.3, o.z); rain.setMatrixAt(i, M); } rain.instanceMatrix.needsUpdate = true; }
    lastP = p; r.render(scene, cam);
  });
} else canvas.remove();

// Texte, Stationen, Bowl
const marks = rail.map(b => +b.dataset.p), starts = [.13, .36, .59, .86];
rail.forEach((b, i) => b.addEventListener('click', () => scrollToY(reise.getBoundingClientRect().top + scrollY + (reise.offsetHeight - innerHeight) * marks[i])));
onTick((dt, t) => {
  if (!vis(reise, 100)) return; const p = prog(reise);
  for (const s of stations) s.classList.toggle('on', p >= +s.dataset.a && p < +s.dataset.b);
  const pw = p > .6 && p < .835; power.classList.toggle('on', pw); const pp = range(p, .63, .79); powLis.forEach((li, k) => li.classList.toggle('on', pw && pp >= [0, .5, .25, .12, .62, .82][k]));
  const f = range(p, .87, .965), fe = 1 - Math.pow(1 - f, 3);
  bowl.style.setProperty('--bo', f > 0 ? Math.min(1, f * 3).toFixed(3) : 0); bowl.style.setProperty('--by', `${((1 - fe) * 45).toFixed(2)}vh`); bowl.style.setProperty('--bs', (.55 + fe * .45).toFixed(3)); bowl.style.setProperty('--br', `${((1 - fe) * -16 + Math.sin(t * .6) * 1.2).toFixed(2)}deg`);
  glow.style.setProperty('--g', (ease(range(p, .89, .97)) * (1 + Math.sin(t * 1.4) * .04)).toFixed(3));
  final.classList.toggle('on', f > .6);
  let cur = -1; starts.forEach((s, i) => { if (p >= s) cur = i; }); rail.forEach((b, i) => { b.classList.toggle('on', i === cur); b.classList.toggle('done', i < cur); });
});

