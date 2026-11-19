// Loaves Bakery: Mehlstaub schwebt durch die Backstube und weicht der Maus aus
import { $, start, run, onTick, vis } from './common.js?v=20261119103210';

start();
const cv = $('#mehl'), ctx = cv.getContext('2d'), sec = $('#loaves');
const motes = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2.4 + .5, v: Math.random() * .03 + .008, p: Math.random() * 6 }));
let mx = .5, my = .5; addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });
onTick((dt, t) => {
  if (!vis(sec)) return;
  const w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  ctx.clearRect(0, 0, w, h);
  for (const m of motes) {
    m.y -= m.v * dt; if (m.y < -0.05) m.y = 1.05;
    const dx = m.x - mx, dy = m.y - my, d = Math.hypot(dx, dy); if (d < .16) { m.x += dx / (d + .01) * dt * .12; m.y += dy / (d + .01) * dt * .12; }
    const x = (m.x + Math.sin(t * .5 + m.p) * .02) * w, y = m.y * h;
    ctx.fillStyle = `rgba(255,250,240,${.4 + .3 * Math.sin(t + m.p)})`; ctx.beginPath(); ctx.arc(x, y, m.r, 0, 6.3); ctx.fill();
  }
});
run();
