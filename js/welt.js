// Genusswelten: die normale Seite. Produktkarten klappen auf, die Scroll-Geschichte lädt erst auf Wunsch.
import { $$, start, run, gate } from './common.js?v=20261123094356';

start();

// Produktkarten: Klick zeigt den Text, ein zweiter Klick oder ein Klick daneben schließt ihn wieder
const cards = $$('.pc');
const zu = () => { for (const c of cards) { c.classList.remove('open'); c.setAttribute('aria-expanded', 'false'); } };
for (const c of cards) c.addEventListener('click', () => { const war = c.classList.contains('open'); zu(); if (!war) { c.classList.add('open'); c.setAttribute('aria-expanded', 'true'); } });
document.addEventListener('click', e => { if (!e.target.closest('.pc')) zu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') zu(); });

// Genusswelt entdecken: Die Geschichte wird erst geladen, wenn man sie startet
const STORY = {
  acai: () => import('./acai.js?v=20261123094356'),
  bowl: () => import('./bowl.js?v=20261123094356'),
  nyd: () => import('./nyd-story.js?v=20261123094356'),
};
gate(STORY[document.body.dataset.story]);
run();
