// Dschungel aus echten Pflanzenmodellen (Poly Haven, CC0): eine Szene für die Vorschau im Haus und die Reise bei Bowlers
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

let shared = null;
export function getJungle(opts) { return shared ??= build(opts); }

async function build({ mobile = false } = {}) {
  const V = THREE.Vector3;
  let sd = 11; const sr = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const sg = (a, b) => a + sr() * (b - a);
  const scene = new THREE.Scene();
  const fogA = new THREE.Color('#0f2416'), fogB = new THREE.Color('#2a1238');
  scene.background = fogA.clone(); scene.fog = new THREE.FogExp2(fogA.clone(), 0.085);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const load = id => loader.loadAsync(`assets/models/${id}.glb`).then(g => { g.scene.traverse(o => { if (o.isMesh) { const m = o.material; if (m.alphaTest > 0 || m.transparent) { m.side = THREE.DoubleSide; if (m.map) { m.transparent = false; m.alphaTest = 0.45; } } } }); return g.scene; });
  const [env, fern, cal, ant, pach, shrub, ground] = await Promise.all([
    new RGBELoader().loadAsync('assets/hdri/brown_photostudio_02_1k.hdr'),
    load('fern_02'), load('calathea_orbifolia_01'), load('anthurium_botany_01'), load('pachira_aquatica_01'), load('shrub_sorrel_01'),
    Promise.all(['Diffuse', 'nor_gl', 'Rough'].map(f => new THREE.TextureLoader().loadAsync(`assets/tex/leaves_forest_ground/${f}.webp`)))
  ]);
  env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 0.35;
  scene.add(new THREE.HemisphereLight('#cfe8c8', '#1a1208', 0.6));
  const sun = new THREE.DirectionalLight('#fff1cf', 2.2); sun.position.set(4, 12, 2); scene.add(sun);
  // Boden
  const [gd, gn, gr] = ground; gd.colorSpace = THREE.SRGBColorSpace;
  for (const t of ground) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 30); t.anisotropy = 8; }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 70), new THREE.MeshStandardMaterial({ map: gd, normalMap: gn, roughnessMap: gr, color: '#8a9a78' }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -30); scene.add(floor);
  // Pflanzen-Sets in einzelne Pflanzen zerlegen
  const vars = src => { const by = {}; for (const c of src.children) { const k = (c.name.match(/_([a-z])$/) || [0, c.name])[1]; (by[k] ??= new THREE.Group()).add(c.clone(true)); } const out = Object.values(by); return out.length ? out : [src]; };
  const V_ = { fern: vars(fern), cal: vars(cal), ant: vars(ant), pach: vars(pach), shrub: vars(shrub) };
  const pick = a => a[Math.floor(sr() * a.length)];
  const plants = [];
  const put = (src, s, x, z, ry) => { const o = src.clone(true); const b = new THREE.Box3().setFromObject(o); o.position.sub(new V((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2)); const g = new THREE.Group(); g.add(o); g.scale.setScalar(s); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); plants.push({ g, ph: sr() * 6, amp: 0.012 + sr() * 0.02 }); return g; };
  const kinds = [[V_.fern, 2.6, 3.8], [V_.cal, 2.6, 3.8], [V_.ant, 2.4, 3.6], [V_.fern, 3.4, 4.6], [V_.shrub, 5, 8]];
  const n = mobile ? 90 : 180;
  for (let i = 0; i < n; i++) {
    const z = sg(2, -62), side = sr() < 0.5 ? -1 : 1, x = side * sg(0.7, 3.6);
    const [arr, a, b] = kinds[Math.floor(sr() * kinds.length)]; put(pick(arr), sg(a, b), x, z, sr() * 6.28);
  }
  for (let i = 0; i < (mobile ? 12 : 24); i++) { const side = i % 2 ? -1 : 1; put(pick(V_.pach), sg(2.2, 3.2), side * sg(1.6, 3), 1 - i * 2.6 + sg(-0.8, 0.8), sr() * 6); }
  // Lichtstrahlen
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uOp: { value: 0.8 }, uCol: { value: new THREE.Color('#fff3c8') }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uOp; uniform vec3 uCol; uniform float uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e=pow(abs(dot(vN,vV)),2.2); float a=smoothstep(0.0,0.9,vUv.y)*e*uOp*(0.75+0.25*sin(uT*0.7+vUv.x*12.0)); gl_FragColor=vec4(uCol*a,a); }'
  });
  for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.6, 10, 32, 1, true), shaftMat); s.position.set(sg(-1.8, 1.8), 4.5, -2 - i * 4.8); s.rotation.set(0.28, 0, sg(-0.35, 0.35)); scene.add(s); }
  // Fallende Açaí-Beeren
  const N = mobile ? 260 : 600;
  const bMat = new THREE.MeshPhysicalMaterial({ color: '#2a0a31', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.5, sheenColor: new THREE.Color('#7a2e8c') });
  const berries = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 16, 12), bMat, N); const P = [];
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { P.push({ x: sg(-2.6, 2.6), y: sg(0.2, 7), z: sg(1, -60), v: sg(0.35, 1) }); }
  scene.add(berries);
  // Lila Ube-Licht in der Mitte der Reise
  const ube = new THREE.PointLight('#b06bff', 0, 12, 2); ube.position.set(0, 1.3, -24); scene.add(ube);
  // Licht am Ende: Lichtung
  const glow = new THREE.PointLight('#fff2d6', 30, 18, 2); glow.position.set(0, 3, -56); scene.add(glow);

  // Kamerapfad: p von 0 (Eingang) bis 1 (Lichtung)
  const path = new THREE.CatmullRomCurve3([new V(0, 1.5, 4.5), new V(0.3, 1.35, -6), new V(-0.4, 1.25, -16), new V(0.35, 1.4, -26), new V(-0.2, 1.3, -36), new V(0.1, 1.5, -46), new V(0, 1.7, -54)]);
  const tmp = new V(), ahead = new V();
  function pose(p, cam, sway = 0) {
    p = Math.min(0.999, Math.max(0, p)); path.getPointAt(p, tmp); path.getPointAt(Math.min(1, p + 0.03), ahead);
    cam.position.copy(tmp); cam.position.x += sway * 0.25; cam.position.y += sway * 0.08; ahead.y -= 0.05; cam.lookAt(ahead);
  }
  let t = 0;
  function update(dt, journey = 0) {
    t += dt;
    for (const p of plants) p.g.rotation.z = Math.sin(t * 0.9 + p.ph) * p.amp;
    for (let i = 0; i < N; i++) { const p = P[i]; p.y -= p.v * dt; if (p.y < 0.05) p.y = 7; m4.makeTranslation(p.x + Math.sin(t + i) * 0.05, p.y, p.z); berries.setMatrixAt(i, m4); }
    berries.instanceMatrix.needsUpdate = true; shaftMat.uniforms.uT.value = t;
    // Farbe der Luft: grün, in der Mitte lila (Ube), am Ende hell
    const u = Math.max(0, 1 - Math.abs(journey - 0.48) / 0.18);
    const end = Math.max(0, (journey - 0.82) / 0.18);
    scene.fog.color.copy(fogA).lerp(fogB, u).lerp(new THREE.Color('#e9dcc8'), end);
    scene.background.copy(scene.fog.color);
    scene.fog.density = 0.085 - end * 0.05;
    ube.intensity = u * 22;
  }
  return { scene, pose, update };
}

// Kleine Vorschau oder große Reise: eigener Zeichner für ein Element
export function createView(canvas, { mobile = false, rec = false } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: rec, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.75)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  const cam = new THREE.PerspectiveCamera(55, 1, 0.05, 120);
  let w = 0, h = 0;
  return {
    renderer: r, cam,
    render(scene) {
      const cw = canvas.clientWidth, ch = canvas.clientHeight; if (!cw || !ch) return;
      if (cw !== w || ch !== h) { w = cw; h = ch; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      r.render(scene, cam);
    }
  };
}
