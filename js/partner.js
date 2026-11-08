// Partnerseite: Aufdecken, Seitennavigation, Job-Filter, Formular
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  $$('.split .line').forEach(l => { l.innerHTML = `<span>${l.innerHTML}</span>`; });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('.reveal, .split').forEach(el => io.observe(el));
  // Aktiver Bereich in der Seitenleiste
  const side = $$('.pp-side a'), blocks = $$('.blk');
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) side.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  blocks.forEach(b => spy.observe(b));
  // Jobs filtern
  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => x.classList.toggle('on', x === c));
    const f = c.dataset.f; $$('.job').forEach(j => j.classList.toggle('hide', f !== 'alle' && j.dataset.b !== f));
  }));
  // Kurzporträt kopieren
  $('#copyBio').addEventListener('click', e => { navigator.clipboard?.writeText($('#bio').innerText); e.target.textContent = 'Kopiert'; setTimeout(() => e.target.textContent = 'Text kopieren', 1800); });
  // Formular: Anliegen bestimmt Empfänger und Felder
  const form = $('#form'), art = $('#art');
  const TO = { flaeche: 'info@frooters.eu', handel: 'info@frooters.eu', lieferant: 'info@frooters.eu', presse: 'info@frooters.eu', bewerbung: 'personal@frooters.eu', sonst: 'info@frooters.eu' };
  const sync = () => form.classList.toggle('f-flaeche', art.value === 'flaeche');
  art.addEventListener('change', sync); sync();
  $$('[data-form]').forEach(b => b.addEventListener('click', () => { art.value = b.dataset.form; sync(); $('#kontakt').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => form.querySelector('[name=name]').focus({ preventScroll: true }), 700); }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form)); const label = art.options[art.selectedIndex].text;
    const body = [`Anliegen: ${label}`, `Name: ${d.name}`, d.firma && `Firma: ${d.firma}`, `E-Mail: ${d.mail}`, d.tel && `Telefon: ${d.tel}`, d.ort && `Ort der Fläche: ${d.ort}`, d.qm && `Größe: ${d.qm} m²`, '', d.msg].filter(x => x !== undefined && x !== '').join('\n');
    location.href = `mailto:${TO[art.value]}?subject=${encodeURIComponent(label + ' · ' + (d.firma || d.name))}&body=${encodeURIComponent(body)}`;
  });
  window.__ready = true; window.__step = () => {};
})();
