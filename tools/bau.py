"""Setzt die drei Startseiten (Hero-Entwürfe A, B, C) aus den Teilen in tools/teile zusammen.
Der Teil unter dem Hero (Geschichte, Karte, Jobs, Kontakt) ist in allen dreien derselbe.
Aufruf: python tools/bau.py   (danach python tools/stand.py)"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
T = root / 'tools' / 'teile'
VAR = {
    'a': dict(datei='index.html', theme='#08090b', preload='<link rel="preload" as="image" href="assets/img/frooters/bubble-a-700.webp" imagesrcset="assets/img/frooters/bubble-a-700.webp 700w, assets/img/frooters/bubble-a-1200.webp 1200w" imagesizes="(max-width: 760px) 50vw, 34vw" fetchpriority="high">'),
    'b': dict(datei='b.html', theme='#ffffff', preload='<link rel="preload" as="image" href="assets/img/frooters/bubble-hero-2200.webp" imagesrcset="assets/img/frooters/bubble-hero-1100.webp 1100w, assets/img/frooters/bubble-hero-2200.webp 2200w" imagesizes="100vw" fetchpriority="high">'),
}
kopf = (T / 'kopf.html').read_text(encoding='utf-8')
unten = (T / 'unten.html').read_text(encoding='utf-8')
for v, d in VAR.items():
    k = kopf.replace('%VAR%', v.upper()).replace('%var%', v).replace('%DATEI%', d['datei']).replace('%THEME%', d['theme']).replace('%PRELOAD%\n', d['preload'] + '\n' if d['preload'] else '')
    hero = (T / f'hero-{v}.html').read_text(encoding='utf-8')
    (root / d['datei']).write_text(k + hero + unten, encoding='utf-8')
    print(d['datei'], 'gebaut')
