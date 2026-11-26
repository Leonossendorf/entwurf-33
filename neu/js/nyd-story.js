// nyd-Genusswelt: Der Tisch wird beim Scrollen gedeckt, danach Ube mit lila Farbe (nur wenn man die Maus bewegt)
import { $, $$, REC, reduced, mobile, clamp, range, ease, prog, vis, onTick } from './common.js?v=20261126095339';

// Tisch: vier Dinge kommen nacheinander dazu. Am Ende steht das echte Foto.
const tisch = $('#tisch'), full = $('.t-full'), lis = $$('.t-list li'), count = $('#tCount'), tbar = $('#tBar');
const parts = $$('.tp').sort((a, b) => a.dataset.s - b.dataset.s), tags = $$('.t-tag').sort((a, b) => a.dataset.s - b.dataset.s);
const STEPS = [[.08, .24], [.29, .45], [.50, .66], [.71, .85]];

// Ube: lila Farbe nur, wenn man die Maus bewegt
const ube = $('#ube'), fluidCanvas = $('#fluid');
let fluid = null;
new IntersectionObserver(([e], io) => { if (!e.isIntersecting) return; io.disconnect(); import('./fluid.js?v=20261126095339').then(m => { fluid = m.createFluid(fluidCanvas, { rec: REC, mobile, reduced, theme: 'ube', warm: false }); if (!fluid) fluidCanvas.remove(); }); }, { rootMargin: '120% 0px' }).observe(ube);

let lastDone = -1;
onTick(dt => {
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
  if (fluid) { const on = vis(ube); fluid.setActive(on); if (on) fluid.update(dt); }
});
