// Genussmanufaktur · inoffizieller Entwurf von Leon Oßendorf
import Lenis from './lenis.mjs?v=20261109071741';
import { createFluid } from './fluid.js?v=20261109071741';

const REC = new URLSearchParams(location.search).has('rec');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x * x * (3 - 2 * x);

// Lage eines Elements, egal ob auf der Seite oder in der Raum-Bühne (die verkleinert dargestellt wird)
function view(el) {
  const r = el.getBoundingClientRect(), sc = el.closest('.stage');
  if (!sc) return { top: r.top, h: r.height, vh: innerHeight };
  const s = sc.getBoundingClientRect(), k = sc.clientHeight / Math.max(1, s.height);
  return { top: (r.top - s.top) * k, h: r.height * k, vh: sc.clientHeight };
}
const vis = el => { const v = view(el); return v.top + v.h > 0 && v.top < v.vh; };
const prog = el => { const v = view(el); return clamp(-v.top / Math.max(1, v.h - v.vh)); };

// Text in Zeilen, die von unten hereinrollen
$$('.split .line').forEach(l => { l.innerHTML = `<span>${l.innerHTML}</span>`; });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
$$('.reveal, .split').forEach(el => io.observe(el));

// Sanftes Scrollen
let lenis = null;
if (!REC && !reduced) lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
$$('a[href^="#"]:not([data-room])').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); if (lenis) lenis.scrollTo(t, { duration: 1.6 }); else t.scrollIntoView({ behavior: 'smooth' }); }));

// Mauskreis
const cursor = $('#cur');
addEventListener('pointermove', e => { cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
$$('.room').forEach(r => { r.addEventListener('pointerenter', () => { if (!r.classList.contains('zooming')) cursor.classList.add('enter'); }); r.addEventListener('pointerleave', () => cursor.classList.remove('enter')); });

// Farbstrom (Frooters) und lila Effekt (Ube)
const fluidCanvas = $('#fluid');
const fluid = createFluid(fluidCanvas, { rec: REC, mobile, reduced });
if (!fluid) document.body.classList.add('no-webgl');
const juice = $('#frooters'), ube = $('#ube');

// Bausteine laden
let theke = null, nyd = null, jungle = null, jMini = null, jBig = null, nydLoading = null;
const ready = [];
const safe = p => p.catch(e => console.warn('Baustein ohne WebGL', e));
const load = {
  theke: () => import('./theke.js?v=20261109071741').then(m => m.createTheke($('.r-frooters'), { mobile, rec: REC })).then(x => { theke = x; }),
  jungle: () => import('./jungle.js?v=20261109071741').then(async m => { jungle = await m.getJungle({ mobile }); jMini = m.createView($('#jungleMini'), { mobile, rec: REC }); jBig = m.createView($('#jungleBig'), { mobile, rec: REC }); }),
  nyd: () => nydLoading || (nydLoading = safe(import('./nyd.js?v=20261109071741').then(m => m.createNyd({ canvas: $('#nydCanvas'), wrap: $('#nyd'), root: $('#nyd'), rec: REC, reduced, prog })).then(n => { nyd = n; }))),
};
ready.push(safe(load.theke()), safe(load.jungle()));
if (REC) ready.push(load.nyd());
else { const lazy = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; lazy.unobserve(e.target); load.nyd(); }), { rootMargin: '150% 0px' }); lazy.observe($('#nyd')); }

// Mehl im Loaves-Raum
const flour = $('#flourCv'), fctx = flour.getContext('2d');
const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, v: Math.random() * .03 + .01, p: Math.random() * 6 }));
function drawFlour(t) {
  const w = flour.clientWidth, h = flour.clientHeight; if (flour.width !== w) { flour.width = w; flour.height = h; }
  fctx.clearRect(0, 0, w, h);
  for (const m of motes) { m.y -= m.v * 0.016; if (m.y < -0.05) m.y = 1.05; const x = (m.x + Math.sin(t * .5 + m.p) * .02) * w, y = m.y * h; fctx.fillStyle = `rgba(255,250,240,${.35 + .3 * Math.sin(t + m.p)})`; fctx.beginPath(); fctx.arc(x, y, m.r, 0, 6.3); fctx.fill(); }
}

// ===== Durchs Haus: Raum anklicken, hineinzoomen, das Kapitel läuft direkt im Rahmen =====
const stage = $('#stage'), stageIn = $('#stageIn'), roomnav = $('#roomnav'), stHint = $('#stHint');
const heroEl = $('#start'), houseEl = $('#house');
let tkScreen = null;
function thekeScreen() {
  if (!tkScreen) { tkScreen = document.createElement('section'); tkScreen.className = 'tk-screen'; tkScreen.innerHTML = '<p class="tk-screen-text"><b>Frooters · Die Obstküche</b><span>Zeig auf ein Produkt oder schubs das Obst an.</span></p>'; }
  return tkScreen;
}
const ROOMS = [
  { el: $('.r-loaves'), name: 'Loaves Bakery', secs: ['#loaves'], bg: '#e8d3b0' },
  { el: $('.r-frooters'), name: 'Frooters', secs: ['THEKE', '#frooters'], bg: '#0b0b0b' },
  { el: $('.r-pick'), name: 'Pick Nick', secs: ['#picknick'], bg: '#e9efd9' },
  { el: $('.r-bowlers'), name: 'Bowlers', secs: ['#bowlers'], bg: '#0f2416', auto: true },
  { el: $('.r-nyd'), name: 'Café nyd', secs: ['#nyd', '#ube'], bg: '#1e1517' },
];
const DOOR = 5, NAMES = [...ROOMS.map(r => r.name), 'Haustür · Für Partner'];
let cur = null, busy = false, stageLenis = null;
const moved = [];
function targetRect() { const ss = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ss')) || .84, sy = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sy')) || -3.6) * innerHeight / 100; const w = innerWidth * ss, h = innerHeight * ss; return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2 + sy, width: w, height: h }; }
function fillStage(i) {
  const R = ROOMS[i]; stage.style.setProperty('--stbg', R.bg);
  const needsFluid = R.secs.includes('#frooters') || R.secs.includes('#ube');
  const put = el => { const mark = document.createComment('raum'); el.before(mark); moved.push([el, mark]); stageIn.appendChild(el); };
  if (needsFluid && fluidCanvas) put(fluidCanvas);
  for (const s of R.secs) {
    if (s === 'THEKE') { const scr = thekeScreen(); stageIn.appendChild(scr); if (theke) scr.prepend(theke.el); }
    else put($(s));
  }
  if (R.secs.includes('#nyd')) load.nyd();
  stage.scrollTop = 0;
  if (lenis && !REC) { stageLenis = new Lenis({ wrapper: stage, content: stageIn, lerp: 0.09, smoothWheel: true }); }
}
function emptyStage() {
  stageLenis?.destroy(); stageLenis = null;
  if (tkScreen?.isConnected) { if (theke) ROOMS[1].el.prepend(theke.el); tkScreen.remove(); }
  while (moved.length) { const [el, mark] = moved.pop(); mark.replaceWith(el); }
  stageIn.innerHTML = '';
}
function setNav(i) {
  $('#rnName').textContent = NAMES[i]; $('#rnPos').textContent = `Raum ${i + 1} von ${ROOMS.length}`;
  $('#rnNextName').textContent = i + 1 < ROOMS.length ? NAMES[i + 1] : 'Haustür · Für Partner';
  $$('#rnMap button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
}
function enterRoom(i) {
  if (busy) return;
  if (i === DOOR) { goDoor(); return; }
  if (cur !== null) { if (cur === i) return; leaveRoom(() => enterRoom(i)); return; }
  busy = true; cursor.classList.remove('enter');
  const room = ROOMS[i].el;
  if (scrollY > 4) { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else scrollTo(0, 0); }
  const r0 = room.getBoundingClientRect(), hb = houseEl.getBoundingClientRect();
  houseEl.style.setProperty('--ox', `${r0.left + r0.width / 2 - hb.left}px`); houseEl.style.setProperty('--oy', `${r0.top + r0.height / 2 - hb.top}px`);
  const ph = document.createElement('div'); ph.className = 'room-placeholder'; ph.style.gridColumn = getComputedStyle(room).gridColumn; ph.style.height = r0.height + 'px'; room.after(ph);
  Object.assign(room.style, { top: r0.top + 'px', left: r0.left + 'px', width: r0.width + 'px', height: r0.height + 'px' });
  room.classList.add('zooming'); document.body.appendChild(room);
  lenis?.stop(); document.body.classList.add('zoom-lock');
  cur = i; ROOMS[i].ph = ph; ROOMS[i].r0 = r0;
  setNav(i); roomnav.classList.add('on'); roomnav.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => requestAnimationFrame(() => { const t = targetRect(); Object.assign(room.style, { top: t.top + 'px', left: t.left + 'px', width: t.width + 'px', height: t.height + 'px', borderRadius: '22px' }); heroEl.classList.add('zoom'); }));
  setTimeout(() => {
    fillStage(i); stage.classList.add('on'); stage.setAttribute('aria-hidden', 'false');
    setTimeout(() => { room.style.visibility = 'hidden'; busy = false; stHint.classList.add('on'); }, 460);
    if (ROOMS[i].auto) setTimeout(() => { if (cur !== i) return; const j = $('#bowlers'); const top = j.offsetTop + (j.offsetHeight - stage.clientHeight) * 0.15; if (stageLenis) stageLenis.scrollTo(top, { duration: 4.2, easing: x => 1 - Math.pow(1 - x, 3) }); else stage.scrollTo({ top, behavior: 'smooth' }); }, 900);
  }, reduced ? 50 : 980);
}
function leaveRoom(cb) {
  if (cur === null) { cb?.(); return; }
  if (busy) return; busy = true;
  const R = ROOMS[cur], room = R.el;
  stHint.classList.remove('on'); room.style.visibility = '';
  stage.classList.remove('on'); stage.setAttribute('aria-hidden', 'true');
  if (!cb) { roomnav.classList.remove('on'); roomnav.setAttribute('aria-hidden', 'true'); }
  setTimeout(() => {
    emptyStage();
    const r0 = R.r0;
    Object.assign(room.style, { top: r0.top + 'px', left: r0.left + 'px', width: r0.width + 'px', height: r0.height + 'px', borderRadius: '16px' });
    heroEl.classList.remove('zoom');
    setTimeout(() => {
      room.classList.remove('zooming'); room.removeAttribute('style'); R.ph.replaceWith(room); cur = null; busy = false;
      if (!cb) { lenis?.start(); document.body.classList.remove('zoom-lock'); }
      cb?.();
    }, reduced ? 50 : 1000);
  }, 420);
}
function goDoor() {
  const go = () => {
    const d = $('.door'), r = d.getBoundingClientRect(), hb = houseEl.getBoundingClientRect();
    houseEl.style.setProperty('--ox', `${r.left + r.width / 2 - hb.left}px`); houseEl.style.setProperty('--oy', `${r.top + r.height / 2 - hb.top}px`);
    document.body.classList.add('zoom-lock'); heroEl.classList.add('zoom'); roomnav.classList.remove('on');
    setTimeout(() => { location.href = 'partner.html'; }, 700);
  };
  if (cur !== null) leaveRoom(go); else go();
}
ROOMS.forEach((R, i) => { R.el.addEventListener('click', () => { if (cur === null) enterRoom(i); }); R.el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && cur === null) { e.preventDefault(); enterRoom(i); } }); });
$('.door').addEventListener('click', e => { e.preventDefault(); goDoor(); });
$$('[data-room]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); enterRoom(+a.dataset.room); }));
$('#rnBack').addEventListener('click', () => leaveRoom());
$('#rnNext').addEventListener('click', () => { if (cur !== null) enterRoom(cur + 1 < ROOMS.length ? cur + 1 : DOOR); });
$$('#rnMap button').forEach(b => b.addEventListener('click', () => enterRoom(+b.dataset.i)));
addEventListener('keydown', e => { if (cur === null) return; if (e.key === 'Escape') leaveRoom(); if (e.key === 'ArrowRight' && e.altKey) $('#rnNext').click(); });
stage.addEventListener('scroll', () => { if (stage.scrollTop > 60) stHint.classList.remove('on'); }, { passive: true });

// ===== Frooters: Smoothie-Becher im Farbstrom =====
const cupsBox = $('#cups'), cupTag = $('#cupTag');
const cups = $$('.cup').map((el, k) => ({ el, c: el.dataset.c.split(',').map(Number), n: el.dataset.n, x: 0, y: 0, vx: 0, vy: 0, hx: 0, hy: 0, s: 1, ph: k * 1.7 }));
function layoutCups() {
  const W = cupsBox.clientWidth, H = cupsBox.clientHeight, base = Math.min(W, H) * (mobile ? .3 : .27);
  const spots = [[.18, .2, 1.15], [.55, .12, 1], [.86, .3, .95], [.32, .5, 1.25], [.7, .58, 1.1], [.12, .78, .9], [.48, .85, .95], [.9, .82, .85], [.05, .45, .75], [.95, .05, .7]];
  cups.forEach((c, k) => { const [sx, sy, sc] = spots[k % spots.length]; c.s = base * sc; c.el.style.setProperty('--s', c.s + 'px'); c.hx = sx * (W - c.s); c.hy = sy * (H - c.s); if (!c.x) { c.x = c.hx; c.y = c.hy; } });
}
layoutCups(); addEventListener('resize', layoutCups);
const cp = { x: -1e4, y: -1e4, px: -1e4, py: -1e4 };
addEventListener('pointermove', e => { const b = cupsBox.getBoundingClientRect(), k = cupsBox.clientWidth / Math.max(1, b.width); cp.x = (e.clientX - b.left) * k; cp.y = (e.clientY - b.top) * k; }, { passive: true });
cups.forEach(c => {
  c.el.addEventListener('pointerenter', () => { const b = c.el.getBoundingClientRect(), f = fluidCanvas.getBoundingClientRect(); fluid?.burst((b.left + b.width / 2 - f.left) / f.width, 1 - (b.top + b.height / 2 - f.top) / f.height, c.c.map(v => v * .9), 1.4); cupTag.textContent = c.n; cupTag.classList.add('on'); c.hot = 1; });
  c.el.addEventListener('pointerleave', () => cupTag.classList.remove('on'));
});
function updateCups(dt, t) {
  for (const c of cups) {
    const cx = c.x + c.s / 2, cy = c.y + c.s / 2, dx = cx - cp.x, dy = cy - cp.y, d = Math.hypot(dx, dy), R = c.s * .75;
    if (d < R && d > 1) { const f = (R - d) / R; c.vx += dx / d * f * 900 * dt; c.vy += dy / d * f * 900 * dt; }
    c.vx += (c.hx - c.x) * 2.2 * dt; c.vy += (c.hy - c.y) * 2.2 * dt; c.vx *= Math.exp(-dt * 3); c.vy *= Math.exp(-dt * 3);
    c.x += c.vx * dt; c.y += c.vy * dt;
    const bob = Math.sin(t * .8 + c.ph) * 8, rot = Math.sin(t * .5 + c.ph) * 6 + c.vx * .02;
    c.hot = Math.max(0, (c.hot || 0) - dt * 1.5);
    c.el.style.transform = `translate(${c.x}px,${c.y + bob}px) rotate(${rot}deg) scale(${1 + c.hot * .06})`;
  }
  if (cupTag.classList.contains('on')) cupTag.style.transform = `translate(${cp.x + cupsBox.offsetLeft + 18}px,${cp.y + cupsBox.offsetTop - 10}px)`;
}

// ===== Bowlers-Reise =====
const jWrap = $('#bowlers'), jSt = $$('.j-st'), jFinal = $('#jFinal'), jBowl = $('.j-bowl'), jGlow = $('.j-glow'), jBar = $('#jBar'), jPow = $$('.j-power li');

// ===== Pick Nick: Pack den Korb =====
const turb = $('#turb'); let boilT = 0, seed = 1;
const dd = $$('.dd').map(g => { const m = g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/); return { g, x: +m[1], y: +m[2], r: +(m[3] || 0), d: +g.dataset.d, ph: Math.random() * 6 }; });
let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
const pick = $('#picknick'), wanderer = $('#wanderer'), pItems = $$('.pi').map((g, k) => ({ g, tx: +g.dataset.tx, ty: +g.dataset.ty, k })), pList = $$('#pickList li');
const loaves = $('#loaves'), letters = $$('.loaves h2 span');
const nav = $('#nav'), darkSecs = ['#nyd', '#ube', '#bowlers', '.partner-teaser', '.foot'].map($);
const nydSticky = $('#nydSticky');

let t = 0;
function tick(dt, now) {
  t += dt;
  if (lenis) lenis.raf(now);
  if (stageLenis) stageLenis.raf(now);
  if (cur === null) { let light = false; for (const s of darkSecs) { const r = s.getBoundingClientRect(); if (r.top <= 40 && r.bottom > 40) { light = true; break; } } nav.classList.toggle('light', light); nav.classList.toggle('bar', scrollY > innerHeight * 0.85); }

  // Haus: lebendige Räume
  const heroVis = heroEl.getBoundingClientRect().bottom > 0;
  if (heroVis || cur !== null) {
    if (cur === null || cur === 0) drawFlour(t);
    if (theke) theke.update(dt);
    if (jungle && jMini && (cur === null || (cur === 3 && !stage.classList.contains('on')))) { jungle.update(dt, 0); jungle.pose(0.002 + Math.sin(t * 0.3) * 0.002, jMini.cam, Math.sin(t * 0.4)); jMini.render(jungle.scene); }
  }
  // Farbstrom und Ube
  if (fluid) {
    const a = vis(juice), b = vis(ube);
    fluid.setActive(a || b); fluidCanvas.style.visibility = a || b ? 'visible' : 'hidden';
    if (a || b) { const v = view(ube); fluid.setTheme(b && v.top < v.vh * 0.75 ? 'ube' : 'fruit'); fluid.update(dt); }
  }
  if (vis(juice)) updateCups(dt, t);
  // Café nyd: Bild blendet weich aus dem Dunkel auf
  if (vis($('#nyd'))) { const v = view($('#nyd')); nydSticky.style.opacity = clamp(1 - v.top / (v.vh * 0.85)).toFixed(3); if (nyd) nyd.update(dt); }
  // Dschungelreise
  if (jungle && jBig && vis(jWrap)) {
    const p = prog(jWrap);
    jungle.update(dt, p); jungle.pose(p * 0.98, jBig.cam, Math.sin(t * 0.5) * 0.3); jBig.render(jungle.scene);
    for (const s of jSt) s.classList.toggle('on', p >= +s.dataset.a && p < +s.dataset.b);
    const pp = clamp((p - 0.57) / 0.22); jPow.forEach((li, k) => li.classList.toggle('on', pp > k / jPow.length * 0.92));
    const f = clamp((p - 0.85) / 0.11), fe = 1 - Math.pow(1 - f, 3);
    jBowl.style.setProperty('--bo', f > 0 ? Math.min(1, f * 3).toFixed(3) : 0);
    jBowl.style.setProperty('--by', `${(1 - fe) * 45}vh`); jBowl.style.setProperty('--bs', (0.55 + fe * 0.45).toFixed(3)); jBowl.style.setProperty('--br', `${(1 - fe) * -16 + Math.sin(t * .6) * 1.2}deg`);
    jGlow.style.setProperty('--g', (ease(clamp((p - 0.88) / 0.1)) * (1 + Math.sin(t * 1.4) * .04)).toFixed(3));
    jFinal.classList.toggle('on', f > 0.65); jBar.style.width = p * 100 + '%';
  }
  // Pick Nick: gezeichnet, zitternd, Dinge fliegen in den Korb
  if (vis(pick)) {
    const p = prog(pick);
    boilT += dt; if (boilT > 0.12 && !reduced) { boilT = 0; seed = seed % 6 + 1; turb.setAttribute('seed', seed); }
    for (const o of dd) o.g.setAttribute('transform', `translate(${(o.x + mx * 40 * o.d).toFixed(1)} ${(o.y + Math.sin(t * .9 + o.ph) * 6 + my * 30 * o.d).toFixed(1)}) rotate(${(o.r + Math.sin(t * .7 + o.ph) * 3).toFixed(2)})`);
    for (const it of pItems) {
      const a = clamp((p - 0.08 - it.k * 0.11) / 0.13), e = ease(a);
      const bx = 500 + (it.k - 2.5) * 22, by = 450;
      const x = it.tx + (bx - it.tx) * e, y = it.ty + (by - it.ty) * e - Math.sin(e * Math.PI) * 140;
      const sc = (a >= 1 ? 0 : 1.45 - e * 1.0) * (1 + Math.sin(t * 2 + it.k) * .02 * (1 - e));
      it.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((1 - e) * Math.sin(t + it.k) * 8 + e * 30).toFixed(1)}) scale(${sc.toFixed(3)})`);
      pList[it.k]?.classList.toggle('on', a >= 1);
    }
    pick.classList.toggle('done', p > 0.8);
    wanderer.style.setProperty('--wx', `${-15 + p * 120}vw`); wanderer.style.setProperty('--wy', `${-Math.abs(Math.sin(p * 60)) * 10}px`);
  }
  if (vis(loaves)) {
    const v = view(loaves), q = clamp((v.vh - v.top) / (v.vh * 0.9));
    letters.forEach((l, k) => { const a = reduced ? 1 : clamp((q - 0.15 - k * 0.06) / 0.45), e = 1 - Math.pow(1 - a, 3); l.style.setProperty('--y', `${(1 - e) * 40}%`); l.style.setProperty('--s', 0.6 + 0.4 * e); l.style.setProperty('--o', e); });
  }
}
addEventListener('resize', () => { fluid?.resize(); nyd?.resize(); });

if (REC) {
  Promise.all(ready).then(() => { window.__step = n => { for (let i = 0; i < n; i++) tick(1 / 30, performance.now()); }; window.__room = i => enterRoom(i); window.__leave = () => leaveRoom(); window.__stage = y => { stage.scrollTop = y; }; window.__stageH = () => stageIn.scrollHeight - stage.clientHeight; window.__ready = true; });
} else {
  let last = performance.now();
  (function f(now) { const dt = Math.min((now - last) / 1000, 1 / 30); last = now; tick(dt, now); requestAnimationFrame(f); })(last);
  window.__ready = true;
}
