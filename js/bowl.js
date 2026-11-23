// Bowlers-Genusswelt: In fünf Schritten zur eigenen Bowl. Die Tafel aus dem Laden wird Spalte für Spalte herangeholt.
import { $, $$, clamp, prog, vis, onTick } from './common.js?v=20261123120221';

const bau = $('#bau'), tafel = $('.bau-tafel'), fotos = $$('.bau-foto'), steps = $$('#bauSteps li'), count = $('#bauCount'), bar = $('#bauBar');
// Wohin die Tafel je Schritt rückt: Mittelpunkt im Bild (in Prozent) und Vergrößerung
const BLICK = [[46, 32, 1.25], [31, 29, 2.3], [42, 27, 2.3], [51, 22, 2.5], [58, 19, 2.6], [64, 17, 2.6], [46, 32, 1.25]];
let cur = -1;
onTick(() => {
  if (!vis(bau)) return;
  const p = prog(bau), i = clamp(Math.floor(p * steps.length * .999), 0, steps.length - 1);
  if (i === cur) return; cur = i;
  steps.forEach((s, k) => s.classList.toggle('on', k === i));
  const [x, y, z] = BLICK[i];
  tafel.style.setProperty('--ox', x + '%'); tafel.style.setProperty('--oy', y + '%'); tafel.style.setProperty('--z', z);
  for (const f of fotos) f.classList.toggle('on', +f.dataset.s === i);
  count.textContent = `${clamp(i, 0, 5)} / 5`; bar.style.width = clamp(i / 5) * 100 + '%';
});
