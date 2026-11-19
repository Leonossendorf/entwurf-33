// Café nyd: der Tisch wird beim Scrollen gedeckt, der Rundgang zieht seitlich vorbei, Ube mit lila Farbeffekt
import { $, $$, REC, reduced, mobile, clamp, range, ease, prog, vis, start, run, onTick } from './common.js?v=20261119104114';

start();
const vertical = matchMedia('(max-width: 900px)').matches;

// Ankommen: Bild fährt beim Wegscrollen leicht heran
const hero = $('#hero'), heroImg = $('.hero-img'), heroHint = $('.hero-hint');

// Tisch: vier Dinge kommen nacheinander dazu. Am Ende steht das echte Foto.
const tisch = $('#tisch'), full = $('.t-full'), lis = $$('.t-list li'), count = $('#tCount'), tbar = $('#tBar');
const parts = $$('.tp').sort((a, b) => a.dataset.s - b.dataset.s), tags = $$('.t-tag').sort((a, b) => a.dataset.s - b.dataset.s);
const STEPS = [[.08, .24], [.29, .45], [.50, .66], [.71, .85]];

// Rundgang
const film = $('#film'), ftrack = $('#fTrack'), fbar = $('#fBar');
let ftravel = 0;
function layout() { if (vertical) return; ftravel = Math.max(0, ftrack.scrollWidth - innerWidth); film.style.height = innerHeight + ftravel + 'px'; }
layout(); addEventListener('resize', () => { if (matchMedia('(max-width: 900px)').matches !== vertical) location.reload(); else layout(); }); addEventListener('load', layout);

// Ube: lila Farbe nur, wenn man die Maus bewegt
const ube = $('#ube'), fluidCanvas = $('#fluid');
let fluid = null;
new IntersectionObserver(([e], io) => { if (!e.isIntersecting) return; io.disconnect(); import('./fluid.js?v=20261119104114').then(m => { fluid = m.createFluid(fluidCanvas, { rec: REC, mobile, reduced, theme: 'ube', warm: false }); if (!fluid) fluidCanvas.remove(); }); }, { rootMargin: '120% 0px' }).observe(ube);

let lastDone = -1;
onTick(dt => {
  if (vis(hero)) { const r = hero.getBoundingClientRect(), q = clamp(-r.top / r.height); heroImg.style.transform = `scale(${(1 + q * .14).toFixed(4)})`; heroHint.style.opacity = clamp(1 - q * 5); }
  if (vis(tisch)) {
    const p = prog(tisch); let active = -1, done = 0;
    STEPS.forEach(([a, b], i) => {
      const e = ease(range(p, a, b)), el = parts[i];
      el.style.opacity = e.toFixed(3); el.style.transform = `translate3d(0,${((1 - e) * -38).toFixed(1)}px,0) scale(${(1.14 - .14 * e).toFixed(4)})`;
      if (p >= a - .03) active = i; if (p >= b - .01) done = i + 1;
      lis[i].classList.toggle('done', p >= b - .01); tags[i].classList.toggle('on', p >= b - .01 && p < .9);
    });
    const fin = p > .9;
    lis.forEach((l, i) => l.classList.toggle('on', i === active && !fin && done <= i));
    full.style.opacity = ease(range(p, .87, .94)).toFixed(3);
    tisch.classList.toggle('fin', fin);
    if (done !== lastDone) { lastDone = done; count.textContent = `${done} / 4`; }
    tbar.style.width = (clamp(p / .86) * 100).toFixed(1) + '%';
  }
  if (!vertical && vis(film)) { const p = prog(film); ftrack.style.transform = `translate3d(${(-p * ftravel).toFixed(1)}px,0,0)`; fbar.style.width = (p * 100).toFixed(1) + '%'; }
  if (fluid) { const on = vis(ube); fluid.setActive(on); if (on) fluid.update(dt); }
});
run();
