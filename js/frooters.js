// Frooters: die Theke entlang, Obst zum Anschubsen, Produkte zum Antippen, Smoothies mit Farbe
import { $, $$, REC, reduced, mobile, clamp, prog, vis, start, run, onTick, lockScroll, scrollToY, lenis } from './common.js?v=20261119103632';
import { createFruitWorld } from './fruit.js?v=20261119103632';

start();
const vertical = matchMedia('(max-width: 900px)').matches;
const theke = $('#theke'), track = $('#tkTrack'), hot = $('#tkHot'), nav = $('#tkNav'), panel = $('#tkPanel'), canvas = $('#fruit');
const slabs = $$('.slab', track);

// Texte zu den Stationen (Reihenfolge wie die Fotos auf der Theke)
const ITEMS = [
  { n: 'Frozen Yogurt', k: 'Frisch gezapft', p: 'Leicht, locker und frisch aus der Maschine. Du suchst dir aus, was obendrauf kommt: frisches Obst, Saucen und allerlei zum Naschen. Serviert in der knusprigen Waffelschale.', c: ['In der Waffelschale', 'Toppings nach Wahl', 'Mit frischem Obst'] },
  { n: 'Bubble Waffles', k: 'Warm aus dem Eisen', p: 'Außen knusprig, innen weich: die Waffel mit den Blasen. Sie kommt frisch gebacken in den roten Frooters-Becher, gefüllt mit Frozen Yogurt, Obst, Sauce und Naschereien.', c: ['Frisch gebacken', 'Im roten Becher', 'Zum Mitnehmen'] },
  { n: 'Müslibecher', k: 'Zum Löffeln', p: 'Fruchtpüree, frische Erdbeeren und knuspriges Granola, Schicht für Schicht. Genau richtig für den kleinen Hunger zwischendurch.', c: ['Fruchtpüree', 'Knuspriges Granola', 'Frische Früchte'] },
  { n: 'Smoothies', k: 'Frisch gemixt', p: 'Aus ganzen Früchten, jeden Tag frisch gemixt. Rot, orange, gelb oder ganz cremig: Die Farbe kommt nur vom Obst.', c: ['Aus ganzen Früchten', 'Jeden Tag frisch', 'Auch als Saft'] },
  { n: 'Grüne Smoothies', k: 'Mit Gemüse', p: 'Spinat, Apfel, Gurke und was sonst noch grün ist. Frisch, leicht und überraschend fruchtig.', c: ['Mit Spinat', 'Mit Apfel und Gurke', 'Frisch gemixt'] },
  { n: 'Waffel mit Froyo', k: 'Frisch gebacken', p: 'Eine warme Waffel, darauf Frozen Yogurt, frisches Obst und bunte Streusel. Zum Hinsetzen und Genießen.', c: ['Warm serviert', 'Mit Frozen Yogurt', 'Mit Obst'] },
  { n: 'Obstquark', k: 'Cremig und frisch', p: 'Luftiger Quark mit frischem Obst. Leicht, fruchtig und immer eine gute Idee.', c: ['Frisches Obst', 'Im Becher', 'Zum Mitnehmen'] },
  { n: 'Milchreis', k: 'Wie früher', p: 'Cremiger Milchreis mit Himbeeren, Zimt und Zucker. Macht warm ums Herz, auch unterwegs.', c: ['Mit Himbeeren', 'Mit Zimt', 'Im Becher'] },
  { n: 'Eis am Stiel', k: 'Aus Frucht und Joghurt', p: 'Eis am Stiel in vielen Sorten, zum Beispiel Himbeer-Joghurt. Fruchtig, cremig und schnell auf die Hand.', c: ['Viele Sorten', 'Mit Frucht', 'Auf die Hand'] },
  { n: 'Goji & Chia', k: 'Zum Verfeinern', p: 'Goji-Beeren und Chia-Samen als Extra für Smoothie, Quark oder Frozen Yogurt.', c: ['Goji-Beeren', 'Chia-Samen', 'Als Topping'] },
  { n: 'Suppe', k: 'Auch herzhaft', p: 'Wenn es mal nichts Süßes sein soll: eine warme Tomatensuppe, frisch und fruchtig, mit knusprigen Croûtons.', c: ['Warm', 'Herzhaft', 'Mit Croûtons'] },
  { n: 'Espresso', k: 'Zum Schluss', p: 'Ein Espresso zum Obst, zur Waffel oder einfach so.', c: ['Frisch gebrüht', 'Kurz und kräftig'] },
];

slabs.forEach((s, i) => {
  const b = document.createElement('button'); b.className = 'hot'; b.setAttribute('aria-label', ITEMS[i].n + ': mehr erfahren');
  b.innerHTML = `<span class="tag"><i>+</i>${ITEMS[i].n}</span>`;
  b.addEventListener('click', () => open(i));
  b.addEventListener('pointerenter', () => { track.classList.add('hov'); s.classList.add('hov'); });
  b.addEventListener('pointerleave', () => { track.classList.remove('hov'); s.classList.remove('hov'); });
  hot.appendChild(b);
  const c = document.createElement('button'); c.textContent = ITEMS[i].n; c.addEventListener('click', () => goTo(i)); nav.appendChild(c);
});

// Obst
const fruit = createFruitWorld(canvas, { mobile, rec: REC, vertical });
let travel = 0, L = 1, scrollOff = 0, extra = 0, extraT = 0, cur = -1;
function layout() {
  const zones = [];
  if (vertical) {
    L = track.offsetHeight; hot.style.height = L + 'px';
    slabs.forEach((s, i) => { const b = hot.children[i]; b.style.top = s.offsetTop + 'px'; b.style.height = s.offsetHeight + 'px'; zones.push([s.offsetTop - 30, s.offsetTop + 60], [s.offsetTop + s.offsetHeight * .42, s.offsetTop + s.offsetHeight * .58]); });
    zones.push([innerHeight * .45, innerHeight * .9]);
    fruit.layout(L, canvas.clientWidth, zones);
  } else {
    L = track.scrollWidth; travel = Math.max(0, L - innerWidth); theke.style.height = innerHeight + travel + 'px'; hot.style.width = L + 'px';
    slabs.forEach((s, i) => { const b = hot.children[i]; b.style.left = s.offsetLeft + 'px'; b.style.width = s.offsetWidth + 'px'; zones.push([s.offsetLeft - 20, s.offsetLeft + 70]); });
    const st = $('.tk-start'), en = $('.tk-end'); zones.push([st.offsetWidth * .56, st.offsetWidth], [st.offsetWidth * .62, st.offsetWidth * .98], [en.offsetLeft + en.offsetWidth * .6, L - 60]);
    fruit.layout(L, canvas.clientHeight, zones);
  }
}
layout(); addEventListener('resize', () => { if (matchMedia('(max-width: 900px)').matches !== vertical) location.reload(); else layout(); });
addEventListener('load', layout);

// Station öffnen: Theke fährt zur Station, Karte mit Text schiebt herein
const tp = { k: $('#tpK'), t: $('#tpT'), p: $('#tpP'), l: $('#tpL'), nb: $('#tpNext b') };
function fill(i) {
  const it = ITEMS[i]; panel.classList.remove('show');
  tp.k.textContent = it.k; tp.t.textContent = it.n; tp.p.textContent = it.p; tp.l.innerHTML = it.c.map(c => `<li>${c}</li>`).join(''); tp.nb.textContent = ITEMS[(i + 1) % ITEMS.length].n; $('#tpN').textContent = String(i + 1).padStart(2, '0');
  void panel.offsetWidth; panel.classList.add('show');
}
function aim(i) { if (vertical) return; const s = slabs[i], avail = innerWidth - panel.offsetWidth; extraT = s.offsetLeft - (avail - s.offsetWidth) / 2 - scrollOff; }
function open(i) {
  if (cur < 0) lockScroll(true);
  cur = i; theke.classList.add('open'); document.body.classList.add('sheet-open'); slabs.forEach((s, k) => s.classList.toggle('on', k === i)); panel.setAttribute('aria-hidden', 'false'); fill(i); aim(i);
  if (vertical) { const r = slabs[i].getBoundingClientRect(); if (r.top < 60 || r.top > innerHeight * .3) scrollTo({ top: scrollY + r.top - 70, behavior: 'smooth' }); }
}
function close() {
  if (cur < 0) return; cur = -1; theke.classList.remove('open'); document.body.classList.remove('sheet-open'); slabs.forEach(s => s.classList.remove('on')); panel.setAttribute('aria-hidden', 'true');
  lockScroll(false);
  if (!vertical) { // Scrollstand dorthin legen, wo die Theke gerade steht
    const total = scrollOff + extra, ns = clamp(total, 0, travel), y = theke.offsetTop + ns;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
    scrollOff = ns; extra = total - ns; extraT = 0;
  }
}
$('#tkX').addEventListener('click', close); $('#tkDim').addEventListener('click', close);
$('#tpNext').addEventListener('click', () => open((cur + 1) % ITEMS.length));
$('#tpPrev').addEventListener('click', () => open((cur - 1 + ITEMS.length) % ITEMS.length));
addEventListener('keydown', e => { if (cur < 0) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') open((cur + 1) % ITEMS.length); if (e.key === 'ArrowLeft') open((cur - 1 + ITEMS.length) % ITEMS.length); });
function goTo(i) { const s = slabs[i]; scrollToY(theke.offsetTop + clamp(s.offsetLeft - (innerWidth - s.offsetWidth) / 2, 0, travel)); }

let lastChip = -1;
onTick(dt => {
  if (!vis(theke, 300)) return;
  let off;
  if (vertical) off = canvas.getBoundingClientRect().top - track.getBoundingClientRect().top;
  else {
    if (cur < 0) scrollOff = prog(theke) * travel;
    extra += (extraT - extra) * (1 - Math.exp(-dt * 6.5)); off = scrollOff + extra;
    const tr = `translate3d(${-off.toFixed(1)}px,0,0)`; track.style.transform = tr; hot.style.transform = tr;
    const mid = off + innerWidth / 2; let best = -1, bd = 1e9;
    slabs.forEach((s, i) => { const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    if (bd > innerWidth * .45) best = -1;
    if (best !== lastChip) { lastChip = best; [...nav.children].forEach((c, i) => c.classList.toggle('on', i === best)); if (best >= 0) { const c = nav.children[best]; nav.scrollTo({ left: c.offsetLeft - nav.clientWidth / 2 + c.offsetWidth / 2, behavior: 'smooth' }); } }
  }
  fruit.setOffset(off); fruit.update(dt);
});

// Frisch gemixt: Farbe steigt nur auf, wenn man einen Becher anstößt oder die Maus bewegt
const mix = $('#mix'), fluidCanvas = $('#fluid'), lead = $('#mixLead');
let fluid = null, fluidWanted = false;
new IntersectionObserver(([e], io) => { if (!e.isIntersecting) return; io.disconnect(); fluidWanted = true; import('./fluid.js?v=20261119103632').then(m => { fluid = m.createFluid(fluidCanvas, { rec: REC, mobile, reduced, theme: 'night', warm: false }); if (!fluid) fluidCanvas.remove(); }); }, { rootMargin: '120% 0px' }).observe(mix);
$$('.cup').forEach(c => {
  const rgb = c.dataset.c.split(',').map(Number);
  const fire = () => {
    $$('.cup').forEach(o => o.classList.toggle('on', o === c));
    lead.innerHTML = `<b>${c.dataset.n}.</b> ${c.dataset.t}`;
    if (!fluid) return; const b = c.getBoundingClientRect(), f = fluidCanvas.getBoundingClientRect();
    fluid.setColor(rgb); fluid.jet((b.left + b.width / 2 - f.left) / f.width, 1 - (b.top + b.height * .12 - f.top) / f.height, rgb, 1);
  };
  c.addEventListener('pointerenter', fire); c.addEventListener('click', fire);
});
if (REC) window.__cup = i => $$('.cup')[i].dispatchEvent(new Event('pointerenter'));
onTick(dt => { if (!fluid) return; const on = vis(mix); fluid.setActive(on); if (on) fluid.update(dt); });

run([fruit.loaded]);
if (REC) { window.__open = open; window.__close = close; }
