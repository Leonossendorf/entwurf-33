"""Listet Dateien unter assets/, css/ und js/, die von keiner Seite mehr gebraucht werden.
Aufruf: python tools/aufraeumen.py          (nur zeigen)
        python tools/aufraeumen.py --weg    (in den Nachbarordner archiv-seite verschieben)"""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
pages = ['index.html', 'b.html', 'c.html', 'frooters.html', 'picknick.html', 'bowlers.html', 'nyd.html']
seen, todo = set(), [root / p for p in pages]
text = ''
while todo:
    f = todo.pop()
    if f in seen or not f.exists(): continue
    seen.add(f); t = f.read_text(encoding='utf-8', errors='ignore'); text += t
    for m in re.findall(r'''(?:href|src)=["']([^"'#?]+\.(?:css|js|mjs))''', t): todo.append((root / m).resolve())
    for m in re.findall(r'''from\s+['"](\.{1,2}/[^'"?]+)''', t) + re.findall(r'''import\(\s*['"](\.{1,2}/[^'"?]+)''', t): todo.append((f.parent / m).resolve())
    for m in re.findall(r'''['"](three/addons/[^'"]+)['"]''', t): todo.append((root / 'assets/vendor/addons' / m.split('three/addons/')[1]).resolve())
    if "'three'" in t or '"three"' in t: todo.append((root / 'assets/vendor/three.module.min.js').resolve())
# alte Grundlage der Partnerseite zählt nicht als Quelle für Bilder
text_assets = ''.join(f.read_text(encoding='utf-8', errors='ignore') for f in seen if f.name != 'style.css')
unused = []
for f in sorted(list((root / 'assets').rglob('*')) + list((root / 'css').glob('*')) + list((root / 'js').glob('*'))):
    if not f.is_file(): continue
    rel = f.relative_to(root).as_posix()
    if f.resolve() in seen: continue
    if rel.startswith('assets/img/bowlers/wald-'): continue      # werden im Code zusammengesetzt
    if rel in text_assets: continue
    unused.append(f)
size = sum(f.stat().st_size for f in unused)
print(len(unused), 'Dateien ungenutzt,', size // 1024, 'KB')
for f in unused[:400]: print(' ', f.relative_to(root).as_posix(), f.stat().st_size // 1024, 'KB')
if '--weg' in sys.argv:
    import shutil
    arch = root.parent / 'archiv-seite'
    for f in unused:
        z = arch / f.relative_to(root); z.parent.mkdir(parents=True, exist_ok=True); shutil.move(str(f), str(z))
    for d in sorted([d for d in (root / 'assets').rglob('*') if d.is_dir()], reverse=True):
        if not any(d.iterdir()): d.rmdir()
    print('verschoben nach', arch)
