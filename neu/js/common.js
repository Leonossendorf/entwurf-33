// Genussmanufaktur · gemeinsame Helfer für alle Seiten
import Lenis from './lenis.mjs?v=20261126092546';

export const REC = new URLSearchParams(location.search).has('rec');
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = matchMedia('(pointer: coarse)').matches;
export const mobile = coarse || innerWidth < 760;
export const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = x => x * x * (3 - 2 * x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (p, a, b) => clamp((p - a) / (b - a));
// Fortschritt 0..1 durch einen hohen Abschnitt, dessen Inhalt oben kleben bleibt
export const prog = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
export const vis = (el, m = 0) => { const r = el.getBoundingClientRect(); return r.bottom > -m && r.top < innerHeight + m; };

// Welcher Haus-Entwurf zuletzt offen war: dorthin führen alle Zurück-Links
export const HAUS = 'index.html';

export let lenis = null;
export function start({ smooth = true } = {}) {
  for (const l of $$('.split .line')) l.innerHTML = `<span>${l.innerHTML}</span>`;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  for (const el of $$('.reveal, .split')) io.observe(el);
  if (smooth && !REC && !reduced && !coarse) lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  for (const a of $$('a[data-haus]')) a.setAttribute('href', HAUS + a.dataset.haus);
  for (const a of $$('a[href^="#"]')) a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); scrollToY(t.getBoundingClientRect().top + scrollY); });
}
export function scrollToY(y, opts = {}) { if (lenis) lenis.scrollTo(y, { duration: 1.3, ...opts }); else scrollTo({ top: y, behavior: reduced || REC ? 'auto' : 'smooth' }); }
export function lockScroll(on) { if (lenis) on ? lenis.stop() : lenis.start(); document.documentElement.style.overflow = on ? 'hidden' : ''; }

// Genusswelt entdecken: Die Scroll-Geschichte bleibt zu, bis man sie startet
export function gate(load) {
  const btn = $('#gateGo'), story = $('#story'); if (!btn || !story) return;
  let open = false;
  const go = async () => {
    if (!open) { open = true; story.hidden = false; document.body.classList.add('story-on'); btn.classList.add('open'); try { if (load) await load(); } catch (e) { console.warn('Genusswelt nicht geladen', e); } if (lenis) lenis.resize(); }
    requestAnimationFrame(() => scrollToY(story.getBoundingClientRect().top + scrollY));
  };
  btn.addEventListener('click', go);
  if (location.hash === '#entdecken') go();
}

const ticks = [];
export const onTick = fn => ticks.push(fn);
export function run(ready = []) {
  let t = 0;
  const tick = (dt, now) => { t += dt; if (lenis) lenis.raf(now); for (const f of ticks) f(dt, t); };
  const done = Promise.all(ready.map(p => Promise.resolve(p).catch(e => console.warn('Baustein nicht geladen', e))));
  if (REC) done.then(() => { window.__step = n => { for (let i = 0; i < n; i++) tick(1 / 30, performance.now()); }; window.__ready = true; });
  else {
    let last = performance.now();
    const loop = now => { const dt = Math.min((now - last) / 1000, 1 / 30); last = now; if (!document.hidden) tick(dt, now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop); done.then(() => { window.__ready = true; });
  }
}
