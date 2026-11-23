// Startseiten: Kopfzeile, Karte, Jobs, Kontaktformular. Dazu das Verhalten des jeweiligen Hero-Entwurfs (A, B oder C).
import { $, $$, clamp, start, run, onTick } from './common.js?v=20261123120221';

start();
const hero = document.body.dataset.hero, nav = $('#nav'), top = $('#start');
for (const a of $$('.varianten a')) a.classList.toggle('on', a.dataset.v === hero);

// Karte: Orte nach Breiten- und Längengrad setzen (gleicher Ausschnitt wie tools/karte.py)
const S = 51.28, N = 52.48, W = 5.95, E = 8.80;
for (const el of $$('#kMap [data-lat]')) {
  const x = (+el.dataset.lon - W) / (E - W) * 100;
  el.style.left = x.toFixed(2) + '%'; el.style.top = ((N - +el.dataset.lat) / (N - S) * 100).toFixed(2) + '%';
}
// Schild nach links klappen, wenn es rechts aus der Karte ragen würde
const kMap = $('#kMap'), klappen = () => { const m = kMap.getBoundingClientRect(); for (const p of $$('.k-pin[data-lat]')) { p.classList.remove('links'); if (p.getBoundingClientRect().right > m.right - 8) p.classList.add('links'); } };
klappen(); addEventListener('resize', klappen); addEventListener('load', klappen);
const pins = $$('.k-pin'), orte = $$('.k-ort');
for (const p of pins) p.addEventListener('click', () => {
  for (const q of pins) q.classList.toggle('on', q === p);
  for (const o of orte) o.classList.toggle('on', o.dataset.ort === p.dataset.ort);
});

// Jobs und Kontakt: „Jetzt bewerben“ stellt das Formular auf Bewerbung
const form = $('#form'), thema = $('#fThema'), stelle = $('#fStelle'), note = $('#fNote');
const jobFelder = () => { for (const el of $$('.only-job', form)) el.hidden = thema.value !== 'Bewerbung'; };
thema.addEventListener('change', jobFelder);
for (const a of $$('a[data-job]')) a.addEventListener('click', () => { thema.value = 'Bewerbung'; stelle.value = a.dataset.job; jobFelder(); });
form.addEventListener('submit', e => {
  e.preventDefault(); form.classList.add('done');
  note.textContent = 'Danke! Im Entwurf wird noch nichts verschickt. Später landet deine Nachricht bei info@frooters.eu.';
});

// Entwurf A: Der Lichtschein im Giebel folgt der Maus über den Räumen
if (hero === 'a') {
  const ha = $('.ha');
  for (const r of $$('.ha-room:not(.soon)')) {
    r.addEventListener('pointermove', e => { ha.style.setProperty('--gx', (e.clientX / innerWidth * 100).toFixed(1) + '%'); }, { passive: true });
    r.addEventListener('pointerenter', () => { ha.style.setProperty('--gc', getComputedStyle(r).getPropertyValue('--c')); ha.classList.add('hov'); });
    r.addEventListener('pointerleave', () => ha.classList.remove('hov'));
  }
}

// Entwurf B: Logo wählen, das große Bild wechselt
if (hero === 'b') {
  const tabs = $$('.hb-tab[data-w]'), slides = $$('.hb-slide'), sub = $('#hbSub'), go = $('#hbGo');
  let cur = 'frooters', timer = 0;
  const wahl = w => {
    if (w === cur) return; cur = w;
    for (const t of tabs) t.classList.toggle('on', t.dataset.w === w);
    for (const s of slides) { const on = s.dataset.w === w; if (on) for (const i of $$('img[data-src]', s)) { i.src = i.dataset.src; i.removeAttribute('data-src'); } s.classList.toggle('on', on); }
    const t = tabs.find(t => t.dataset.w === w);
    sub.classList.add('sw'); clearTimeout(timer);
    timer = setTimeout(() => { sub.textContent = t.dataset.t; sub.classList.remove('sw'); }, 220);
    go.href = t.getAttribute('href'); go.firstChild.textContent = `${t.dataset.zu} ${t.dataset.n} `;
    top.dataset.w = w;
  };
  for (const t of tabs) {
    t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') wahl(t.dataset.w); });
    t.addEventListener('focus', () => wahl(t.dataset.w));
    t.addEventListener('click', e => { if (t.dataset.w !== cur) { e.preventDefault(); wahl(t.dataset.w); } });
  }
  // die übrigen Bilder nach dem ersten Aufbau vorladen, damit der Wechsel sofort sitzt
  addEventListener('load', () => setTimeout(() => { for (const i of $$('.hb-slide img[data-src]')) { const p = new Image(); p.src = i.dataset.src; } }, 600), { once: true });
}

// Entwurf C: Aufzug-Anzeige und leichte Tiefe in den Etagen
let lift = null, floors = [], liftNow, liftName, liftBtns, lastF = '';
if (hero === 'c') { lift = $('#lift'); floors = $$('.hc-f'); liftNow = $('#liftNow'); liftName = $('#liftName'); liftBtns = $$('.lift-btns a'); }

// Entwurf D: Beim Scrollen wächst das kleine Haus, bis die vier Räume den Bildschirm füllen
const house = hero === 'd' ? $('#hdHouse') : null;
let lastP = -1;
const lerp = (a, b, t) => a + (b - a) * t, ease = x => x * x * (3 - 2 * x), part = (p, a, b) => clamp((p - a) / (b - a));
function haus() {
  const r = top.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - innerHeight));
  if (Math.abs(p - lastP) < .0005) return; lastP = p;
  const W = innerWidth, H = innerHeight, small = W < 760;
  const w0 = small ? W * .84 : Math.min(W * .46, H * .62), h0 = small ? Math.min(H * .56, w0 * 1.2) : Math.min(H * .6, w0 * .98);
  const e = ease(part(p, .04, .86)), roof0 = h0 * .3;
  const s = top.style;
  s.setProperty('--w', lerp(w0, W, e).toFixed(1) + 'px'); s.setProperty('--h', lerp(h0, H, e).toFixed(1) + 'px');
  s.setProperty('--b', lerp(H * (small ? .1 : .06), 0, e).toFixed(1) + 'px');
  s.setProperty('--rh', lerp(roof0, 0, ease(part(p, .2, .86))).toFixed(1) + 'px');
  s.setProperty('--ro', (1 - part(p, .3, .6)).toFixed(3));
  s.setProperty('--g', lerp(small ? 4 : 6, small ? 3 : 4, e).toFixed(1) + 'px');
  s.setProperty('--t', (1 - part(p, 0, .3)).toFixed(3));
  s.setProperty('--l', ease(part(p, .72, .96)).toFixed(3));
  top.classList.toggle('inside', p > .9);
}

onTick(() => {
  nav.classList.toggle('bar', top.getBoundingClientRect().bottom < 70);
  if (house) haus();
  if (!lift) return;
  let f = floors[0];
  for (const el of floors) if (el.getBoundingClientRect().top <= innerHeight * .5) f = el;
  if (f.dataset.f !== lastF) { lastF = f.dataset.f; liftNow.textContent = lastF; liftName.textContent = f.dataset.n; for (const b of liftBtns) b.classList.toggle('on', b.dataset.f === lastF); }
  lift.classList.toggle('aus', top.getBoundingClientRect().bottom < innerHeight * .12);
  for (const el of floors) {
    const bg = el.querySelector('.hc-bg'); if (!bg) continue;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
    bg.style.transform = `translate3d(0,${(clamp(r.top / innerHeight, -1, 1) * -8).toFixed(2)}%,0)`;
  }
});
run();
