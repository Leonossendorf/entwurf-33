"""Neue Fassung (Ordner /neu): Christian hat Entwurf B gewählt (23.11.2026). Startseite = Hero B + gemeinsamer Teil.
Die Seiten im Hauptordner bleiben eingefroren, damit Christian dort den alten Stand sieht.
Aufruf: python tools/bau.py   (danach python tools/stand.py)"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
T = root / 'tools' / 'teile'
VAR = {
    'b': dict(datei='index.html', theme='#ffffff', preload='<link rel="preload" as="image" href="assets/img/frooters/bubble-hero-2200.webp" imagesrcset="assets/img/frooters/bubble-hero-1100.webp 1100w, assets/img/frooters/bubble-hero-2200.webp 2200w" imagesizes="100vw" fetchpriority="high">'),
}
kopf = (T / 'kopf.html').read_text(encoding='utf-8')
unten = (T / 'unten.html').read_text(encoding='utf-8')
for v, d in VAR.items():
    k = kopf.replace('%VAR%', v.upper()).replace('%var%', v).replace('%DATEI%', d['datei']).replace('%THEME%', d['theme']).replace('%PRELOAD%\n', d['preload'] + '\n' if d['preload'] else '')
    hero = (T / f'hero-{v}.html').read_text(encoding='utf-8')
    (root / d['datei']).write_text(k + hero + unten, encoding='utf-8')
    print(d['datei'], 'gebaut')
