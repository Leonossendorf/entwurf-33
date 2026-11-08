// Genussmanufaktur · inoffizieller Entwurf von Leon Oßendorf
import Lenis from './lenis.mjs';
import { createFluid } from './fluid.js';

const REC = new URLSearchParams(location.search).has('rec');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const vis = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

// Text in Zeilen, die von unten hereinrollen
$$('.split .line').forEach(l => { l.innerHTML = `<span>${l.innerHTML}</span>`; });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
$$('.reveal, .split').forEach(el => io.observe(el));

// Sanftes Scrollen
let lenis = null;
if (!REC && !reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.6 }); } }));
}
const jumpTo = el => { if (lenis) lenis.scrollTo(el, { immediate: true, force: true }); else scrollTo(0, el.offsetTop); };

// Mauskreis
const cursor = $('#cur');
addEventListener('pointermove', e => { cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
$$('.room').forEach(r => { r.addEventListener('pointerenter', () => { if (!r.classList.contains('zooming')) cursor.classList.add('enter'); }); r.addEventListener('pointerleave', () => cursor.classList.remove('enter')); });

// Saft (Frooters) und lila Effekt (Ube)
const fluidCanvas = $('#fluid');
const fluid = createFluid(fluidCanvas, { rec: REC, mobile, reduced });
if (!fluid) document.body.classList.add('no-webgl');
const juice = $('#frooters'), ube = $('#ube');

// Bausteine laden
let theke = null, nyd = null, jungle = null, jMini = null, jBig = null;
const ready = [];
const load = {
  theke: () => import('./theke.js').then(m => m.createTheke($('.r-frooters'), { mobile, rec: REC })).then(x => { theke = x; }),
  jungle: () => import('./jungle.js').then(async m => { jungle = await m.getJungle({ mobile }); jMini = m.createView($('#jungleMini'), { mobile, rec: REC }); jBig = m.createView($('#jungleBig'), { mobile, rec: REC }); }),
  nyd: () => import('./nyd.js').then(m => m.createNyd({ canvas: $('#nydCanvas'), wrap: $('#nyd'), root: $('#nyd'), rec: REC, reduced })).then(n => { nyd = n; }),
};
const safe = p => p.catch(e => console.warn('Baustein ohne WebGL', e));
ready.push(safe(load.theke()), safe(load.jungle()));
if (REC) ready.push(safe(load.nyd()));
else {
  const lazy = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; lazy.unobserve(e.target); safe(load.nyd()); }), { rootMargin: '150% 0px' });
  lazy.observe($('#nyd'));
}

// Mehl im Loaves-Raum
const flour = $('#flourCv'), fctx = flour.getContext('2d');
const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, v: Math.random() * .03 + .01, p: Math.random() * 6 }));
function drawFlour(t) {
  const w = flour.clientWidth, h = flour.clientHeight; if (flour.width !== w) { flour.width = w; flour.height = h; }
  fctx.clearRect(0, 0, w, h);
  for (const m of motes) { m.y -= m.v * 0.016; if (m.y < -0.05) m.y = 1.05; const x = (m.x + Math.sin(t * .5 + m.p) * .02) * w, y = m.y * h; fctx.fillStyle = `rgba(255,250,240,${.35 + .3 * Math.sin(t + m.p)})`; fctx.beginPath(); fctx.arc(x, y, m.r, 0, 6.3); fctx.fill(); }
}

// Räume: Klick fährt hinein
let expanding = null;
function enter(room) {
  if (expanding) return;
  const target = $(room.dataset.go), kind = room.dataset.expand || '';
  if (reduced) { jumpTo(target); return; }
  const r = room.getBoundingClientRect();
  const ph = document.createElement('div'); ph.className = 'room-placeholder'; ph.style.gridColumn = getComputedStyle(room).gridColumn; ph.style.height = r.height + 'px';
  room.after(ph);
  Object.assign(room.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' });
  room.classList.add('expanding'); cursor.classList.remove('enter');
  expanding = { room, ph, kind, t0: performance.now() };
  requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(room.style, { top: '0px', left: '0px', width: '100vw', height: '100vh', borderRadius: '0px' })));
  setTimeout(() => {
    jumpTo(target);
    setTimeout(() => {
      room.style.opacity = '0';
      setTimeout(() => { room.classList.remove('expanding'); room.removeAttribute('style'); ph.remove(); expanding = null; }, 520);
    }, 120);
  }, 1000);
}
// Räume: Klick zoomt hinein, das Haus bleibt drumherum sichtbar
const order = ['.r-frooters', '.r-nyd', '.r-bowlers', '.r-pick', '.r-loaves'].map($);
const roomnav = $('#roomnav'), heroEl = $('#start'), houseEl = $('#house');
let zoomed = null;
function targetRect() { const m = innerWidth < 900; return m ? { top: innerHeight * .1, left: innerWidth * .03, width: innerWidth * .94, height: innerHeight * .76 } : { top: innerHeight * .11, left: innerWidth * .05, width: innerWidth * .9, height: innerHeight * .78 }; }
function zoomIn(room) {
  if (zoomed || expanding) return;
  if (scrollY > 4) jumpTo(heroEl);
  const r0 = room.getBoundingClientRect(), hb = houseEl.getBoundingClientRect();
  houseEl.style.setProperty('--ox', `${r0.left + r0.width / 2 - hb.left}px`); houseEl.style.setProperty('--oy', `${r0.top + r0.height / 2 - hb.top}px`);
  const ph = document.createElement('div'); ph.className = 'room-placeholder'; ph.style.gridColumn = getComputedStyle(room).gridColumn; ph.style.height = r0.height + 'px'; room.after(ph);
  Object.assign(room.style, { top: r0.top + 'px', left: r0.left + 'px', width: r0.width + 'px', height: r0.height + 'px' });
  room.classList.add('zooming'); document.body.appendChild(room); // raus aus dem gezoomten Haus, damit der Raum scharf bleibt cursor.classList.remove('enter');
  lenis?.stop(); document.body.classList.add('zoom-lock');
  zoomed = { room, ph, r0 };
  requestAnimationFrame(() => requestAnimationFrame(() => { const t = targetRect(); Object.assign(room.style, { top: t.top + 'px', left: t.left + 'px', width: t.width + 'px', height: t.height + 'px', borderRadius: '22px' }); heroEl.classList.add('zoom'); }));
  setTimeout(() => room.classList.add('zoomed'), 450);
  $('#rnName').textContent = room.querySelector('.lbl b').textContent; roomnav.classList.add('on'); roomnav.setAttribute('aria-hidden', 'false');
}
function zoomOut(cb) {
  if (!zoomed) { cb?.(); return; }
  const { room, ph, r0 } = zoomed; room.classList.remove('zoomed');
  Object.assign(room.style, { top: r0.top + 'px', left: r0.left + 'px', width: r0.width + 'px', height: r0.height + 'px', borderRadius: '16px' });
  heroEl.classList.remove('zoom'); roomnav.classList.remove('on'); roomnav.setAttribute('aria-hidden', 'true');
  setTimeout(() => { room.classList.remove('zooming'); room.removeAttribute('style'); ph.replaceWith(room); zoomed = null; lenis?.start(); document.body.classList.remove('zoom-lock'); cb?.(); }, 1100);
}
function step(dir) { if (!zoomed) return; const i = order.indexOf(zoomed.room); const next = order[(i + dir + order.length) % order.length]; zoomOut(() => zoomIn(next)); }
$('#rnBack').addEventListener('click', () => zoomOut()); $('#rnPrev').addEventListener('click', () => step(-1)); $('#rnNext').addEventListener('click', () => step(1));
addEventListener('keydown', e => { if (!zoomed) return; if (e.key === 'Escape') zoomOut(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
$$('.room').forEach(r => { r.addEventListener('click', () => { if (!r.classList.contains('zooming')) zoomIn(r); }); r.addEventListener('keydown', e => { if (e.key === 'Enter' && !zoomed) zoomIn(r); }); });
// Aus dem Raum ins Kapitel
$$('.zgo').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation(); const room = zoomed?.room; const target = $(b.dataset.go);
  zoomOut(() => { if (b.dataset.expand && room) { room.dataset.expand = b.dataset.expand; enter(room); } else if (lenis) lenis.scrollTo(target, { duration: 1.6 }); else target.scrollIntoView({ behavior: 'smooth' }); });
}));

// Bowlers-Reise
const jWrap = $('#bowlers'), jSt = $$('.j-st'), jFinal = $('#jFinal'), jBowl = $('.j-bowl'), jBar = $('#jBar');

// Pick Nick
const turb = $('#turb'); let boilT = 0, seed = 1;
const dd = $$('.dd').map(g => { const m = g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/); return { g, x: +m[1], y: +m[2], r: +(m[3] || 0), d: +g.dataset.d, ph: Math.random() * 6 }; });
let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
const pick = $('#picknick'), wanderer = $('#wanderer'), loaves = $('#loaves'), letters = $$('.loaves h2 span');
const nav = $('#nav'), darkSecs = ['#nyd', '#ube', '#bowlers', '.partner-teaser', '.foot'].map($);
const hero = $('#start');

let t = 0;
function tick(dt, now) {
  t += dt;
  if (lenis) lenis.raf(now);
  let light = false; for (const s of darkSecs) { const r = s.getBoundingClientRect(); if (r.top <= 40 && r.bottom > 40) { light = true; break; } }
  nav.classList.toggle('light', light); nav.classList.toggle('bar', scrollY > innerHeight * 0.85);

  // Haus: lebendige Räume
  if (vis(hero) || expanding || zoomed) {
    drawFlour(t);
    const z = expanding ? clamp((performance.now() - expanding.t0) / 950) : 0, ez = z * z * (3 - 2 * z);
    if (theke) theke.update(dt);
    if (jungle && jMini) { jungle.update(dt, 0); jungle.pose(expanding?.kind === 'jungle' ? ez * 0.02 : 0.002 + Math.sin(t * 0.3) * 0.002, jMini.cam, Math.sin(t * 0.4) * (1 - ez)); jMini.render(jungle.scene); }
  }
  // Saft und Ube
  if (fluid) {
    const a = vis(juice), b = vis(ube);
    fluid.setActive(a || b); fluidCanvas.style.visibility = a || b ? 'visible' : 'hidden';
    if (a || b) { fluid.setTheme(b && ube.getBoundingClientRect().top < innerHeight * 0.75 ? 'ube' : 'fruit'); fluid.update(dt); }
  }
  if (nyd && vis($('#nyd'))) nyd.update(dt);
  // Dschungelreise
  if (jungle && jBig && vis(jWrap)) {
    const p = clamp((scrollY - jWrap.offsetTop) / (jWrap.offsetHeight - innerHeight));
    jungle.update(dt, p); jungle.pose(p * 0.98, jBig.cam, Math.sin(t * 0.5) * 0.3); jBig.render(jungle.scene);
    for (const s of jSt) s.classList.toggle('on', p >= +s.dataset.a && p < +s.dataset.b);
    const f = clamp((p - 0.84) / 0.12), fe = f * f * (3 - 2 * f); jBowl.style.setProperty('--r', `${fe * 92 - 10}%`); jBowl.style.setProperty('--z', 1.15 - fe * 0.15); jBowl.style.visibility = f > 0 ? 'visible' : 'hidden'; jBowl.style.opacity = Math.min(1, f * 4);
    jFinal.classList.toggle('on', f > 0.7); jBar.style.width = p * 100 + '%';
  }
  // Pick Nick: gezeichnet, zitternd, der Wanderer läuft mit
  if (vis(pick)) {
    const r = pick.getBoundingClientRect(), q = (innerHeight - r.top) / (innerHeight + r.height);
    boilT += dt; if (boilT > 0.12 && !reduced) { boilT = 0; seed = seed % 6 + 1; turb.setAttribute('seed', seed); }
    for (const o of dd) o.g.setAttribute('transform', `translate(${(o.x + mx * 40 * o.d).toFixed(1)} ${(o.y + (0.5 - q) * 260 * o.d + Math.sin(t * .9 + o.ph) * 6 + my * 30 * o.d).toFixed(1)}) rotate(${(o.r + Math.sin(t * .7 + o.ph) * 3).toFixed(2)})`);
    wanderer.style.setProperty('--wx', `${-15 + q * 120}vw`); wanderer.style.setProperty('--wy', `${-Math.abs(Math.sin(q * 60)) * 10}px`);
  }
  if (vis(loaves)) {
    const r = loaves.getBoundingClientRect(), q = clamp((innerHeight - r.top) / (innerHeight * 0.9));
    letters.forEach((l, k) => { const a = reduced ? 1 : clamp((q - 0.15 - k * 0.06) / 0.45), e = 1 - Math.pow(1 - a, 3); l.style.setProperty('--y', `${(1 - e) * 40}%`); l.style.setProperty('--s', 0.6 + 0.4 * e); l.style.setProperty('--o', e); });
  }
}
addEventListener('resize', () => { fluid?.resize(); nyd?.resize(); });

if (REC) {
  Promise.all(ready).then(() => { window.__step = n => { for (let i = 0; i < n; i++) tick(1 / 30, performance.now()); }; window.__enter = sel => enter($(sel)); window.__zoom = sel => zoomIn($(sel)); window.__zoomOut = () => zoomOut(); window.__stepRoom = d => step(d); window.__ready = true; });
} else {
  let last = performance.now();
  (function f(now) { const dt = Math.min((now - last) / 1000, 1 / 30); last = now; tick(dt, now); requestAnimationFrame(f); })(last);
  window.__ready = true;
}
