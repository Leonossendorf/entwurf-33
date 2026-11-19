// Pick Nick: gezeichnet und leicht zitternd. Beim Scrollen fliegen Kaffee, Brötchen, Brezel, Waffel, Kuchen und Eis in den Korb.
import { $, $$, reduced, clamp, ease, prog, vis, start, run, onTick } from './common.js?v=20261119103210';

start();
const turb = $('#turb'); let boilT = 0, seed = 1;
const dd = $$('.dd').map(g => { const m = g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/); return { g, x: +m[1], y: +m[2], r: +(m[3] || 0), d: +g.dataset.d, ph: Math.random() * 6 }; });
let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
const pick = $('#picknick'), wanderer = $('#wanderer'), pItems = $$('.pi').map((g, k) => ({ g, tx: +g.dataset.tx, ty: +g.dataset.ty, k })), pList = $$('#pickList li');
onTick((dt, t) => {
  if (!vis(pick)) return;
  const p = prog(pick);
  boilT += dt; if (boilT > 0.12 && !reduced) { boilT = 0; seed = seed % 6 + 1; turb.setAttribute('seed', seed); }
  for (const o of dd) o.g.setAttribute('transform', `translate(${(o.x + mx * 40 * o.d).toFixed(1)} ${(o.y + Math.sin(t * .9 + o.ph) * 6 + my * 30 * o.d).toFixed(1)}) rotate(${(o.r + Math.sin(t * .7 + o.ph) * 3).toFixed(2)})`);
  for (const it of pItems) {
    const a = clamp((p - 0.08 - it.k * 0.11) / 0.13), e = ease(a);
    const bx = 500 + (it.k - 2.5) * 22, by = 450;
    const x = it.tx + (bx - it.tx) * e, y = it.ty + (by - it.ty) * e - Math.sin(e * Math.PI) * 140;
    const sc = (a >= 1 ? 0 : 1.22 - e * 0.8) * (1 + Math.sin(t * 2 + it.k) * .02 * (1 - e));
    it.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((1 - e) * Math.sin(t + it.k) * 8 + e * 30).toFixed(1)}) scale(${sc.toFixed(3)})`);
    pList[it.k]?.classList.toggle('on', a >= 1);
  }
  pick.classList.toggle('go', p > 0.04); pick.classList.toggle('done', p > 0.8);
  wanderer.style.setProperty('--wx', `${-15 + p * 120}vw`); wanderer.style.setProperty('--wy', `${-Math.abs(Math.sin(p * 60)) * 10}px`);
});
run();
