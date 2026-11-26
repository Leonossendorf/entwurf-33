// Startseiten: Kopfzeile, Karte, Jobs, Kontaktformular. Dazu das Verhalten des jeweiligen Hero-Entwurfs (A, B oder C).
import { $, $$, clamp, start, run, onTick, scrollToY, lenis } from './common.js?v=20261126092546';

start();
const hero = document.body.dataset.hero, nav = $('#nav'), top = $('#start');

// Fashion · Food · Fun: Fortschritt nur durch Scrollen, nie von selbst
// Drei Entwürfe (A, B, C) zum Vergleichen: Schalter unten rechts, Auswahl bleibt gemerkt, ?dach=b in der Adresse öffnet direkt einen Entwurf
const ff = $('#dach');
if (ff) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, alle = ['a', 'b', 'c'], knoepfe = $$('.varianten button');
  const merk = { get: () => { try { return localStorage.getItem('gmDach'); } catch (e) { return null; } }, set: v => { try { localStorage.setItem('gmDach', v); } catch (e) {} } };
  const wunsch = new URLSearchParams(location.search).get('dach');
  let dach = alle.includes(wunsch) ? wunsch : alle.includes(merk.get()) ? merk.get() : 'a', ffT = 0;
  const ffSet = () => {
    ffT = 0; const st = $(`.dv-${dach} [data-ffp]`); if (!st) return;
    const h = innerHeight; let p = 1;
    if (!still) {
      if ('pin' in st.dataset) { const w = st.parentElement.getBoundingClientRect(), oben = parseFloat(getComputedStyle(st).top) || 0; p = clamp((oben + h * .22 - w.top) / (h * .22 + w.height - st.offsetHeight)); }
      else { const r = st.getBoundingClientRect(); p = clamp((h * +st.dataset.o - (r.top + r.height * +st.dataset.a)) / (h * +st.dataset.b)); }
    }
    ff.style.setProperty('--p', p.toFixed(3));
  };
  const wahl = (v, hin) => {
    dach = v; document.body.dataset.dach = v; merk.set(v);
    for (const k of knoepfe) { const an = k.dataset.v === v; k.classList.toggle('on', an); k.setAttribute('aria-pressed', an); }
    if (lenis) lenis.resize(); ffSet();
    if (hin) scrollToY(ff.getBoundingClientRect().top + scrollY - 40);
  };
  for (const k of knoepfe) k.addEventListener('click', () => wahl(k.dataset.v, true));
  addEventListener('scroll', () => { if (!ffT) ffT = requestAnimationFrame(ffSet); }, { passive: true });
  addEventListener('resize', ffSet); wahl(dach, false);
}

// Karte: Orte nach Breiten- und Längengrad setzen (gleicher Ausschnitt wie tools/karte.py)
const S = 51.22, N = 52.78, W = 6.15, E = 10.85;
for (const el of $$('#kMap [data-lat]')) {
  const x = (+el.dataset.lon - W) / (E - W) * 100;
  el.style.left = x.toFixed(2) + '%'; el.style.top = ((N - +el.dataset.lat) / (N - S) * 100).toFixed(2) + '%';
}
// Schild nach links klappen, wenn es rechts aus der Karte ragen würde
const kMap = $('#kMap'), klappen = () => { const m = kMap.getBoundingClientRect(); for (const p of $$('.k-pin[data-lat]')) { p.classList.remove('links'); if (p.dataset.seite === 'links' || p.getBoundingClientRect().right > m.right - 8) p.classList.add('links'); } };
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

onTick(() => {
  nav.classList.toggle('bar', top.getBoundingClientRect().bottom < 70);

});
run();
