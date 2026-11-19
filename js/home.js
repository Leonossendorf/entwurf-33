// Startseite: das Haus. Die Räume leben (Mehlstaub, Filmschleifen, Zeichnungen), ein Klick führt in die Genusswelt.
import { $, $$, REC, reduced, coarse, start, run, onTick, vis } from './common.js?v=20261119103632';

start();
const hero = $('#start'), nav = $('#nav');

// Mauskreis „Eintreten“ über den Räumen (nur mit Maus)
const cursor = $('#cur');
if (!coarse) {
  addEventListener('pointermove', e => { cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
  for (const r of $$('.room')) { r.addEventListener('pointerenter', () => cursor.classList.add('enter')); r.addEventListener('pointerleave', () => cursor.classList.remove('enter')); r.addEventListener('click', () => cursor.classList.remove('enter')); }
}

// Mehlstaub im Loaves-Raum
const flour = $('#flourCv'), fctx = flour.getContext('2d');
const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, v: Math.random() * .03 + .01, p: Math.random() * 6 }));
function drawFlour(t) {
  const w = flour.clientWidth, h = flour.clientHeight; if (flour.width !== w || flour.height !== h) { flour.width = w; flour.height = h; }
  fctx.clearRect(0, 0, w, h);
  for (const m of motes) { m.y -= m.v * 0.016; if (m.y < -0.05) m.y = 1.05; const x = (m.x + Math.sin(t * .5 + m.p) * .02) * w, y = m.y * h; fctx.fillStyle = `rgba(255,250,240,${.35 + .3 * Math.sin(t + m.p)})`; fctx.beginPath(); fctx.arc(x, y, m.r, 0, 6.3); fctx.fill(); }
}

// Filmschleifen in den Räumen: erst nach dem ersten Bildaufbau laden, nur abspielen, solange das Haus zu sehen ist
const vids = $$('.room video');
const loadVids = () => { if (reduced || REC) return; for (const v of vids) { v.src = v.dataset.src; v.play().catch(() => {}); } };
if (document.readyState === 'complete') loadVids(); else addEventListener('load', loadVids, { once: true });
let playing = true;

// Zeichnungen im Pick-Nick-Raum zittern leicht
const turb = $('#turb'); let boilT = 0, seed = 1;

onTick((dt, t) => {
  nav.classList.toggle('bar', scrollY > innerHeight * .6);
  const on = vis(hero);
  if (on !== playing) { playing = on; for (const v of vids) { if (!v.src) continue; on ? v.play().catch(() => {}) : v.pause(); } }
  if (!on) return;
  drawFlour(t);
  boilT += dt; if (boilT > 0.12 && !reduced) { boilT = 0; seed = seed % 6 + 1; turb.setAttribute('seed', seed); }
});
run();
