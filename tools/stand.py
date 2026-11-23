"""Setzt einen neuen Stand: stand.txt, window.STAND und Versionsnummern in allen Seiten und Skripten.
Aufruf vor jedem Hochladen: python tools/stand.py"""
import pathlib, re, time
root = pathlib.Path(__file__).resolve().parent.parent
s = time.strftime('%Y%m%d%H%M%S')
(root / 'stand.txt').write_text(s, encoding='utf-8')
CHK = '<script>window.STAND="%s";fetch("stand.txt?"+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.text():null).then(s=>{s=s&&s.trim();if(s&&s!==window.STAND&&!sessionStorage.getItem("st"+s)){sessionStorage.setItem("st"+s,"1");location.reload();}}).catch(()=>{});</script>'
pages = ['index.html', 'a.html', 'frooters.html', 'picknick.html', 'bowlers.html', 'nyd.html']
for name in pages:
    p = root / name
    t = p.read_text(encoding='utf-8')
    if 'window.STAND=' in t:
        t = re.sub(r'window\.STAND="[^"]*"', f'window.STAND="{s}"', t)
    else:
        t = t.replace('</body>', CHK % s + '\n</body>', 1)
    t = re.sub(r'((?:css|js)/[\w.-]+\.(?:css|js))(\?v=\d+)?"', lambda m: f'{m.group(1)}?v={s}"', t)
    p.write_text(t, encoding='utf-8')
# Skripte laden einander: überall dieselbe Versionsnummer, sonst lädt der Browser alte Teile
for p in (root / 'js').glob('*.js'):
    t = p.read_text(encoding='utf-8')
    n = re.sub(r"'\./([\w.-]+)\.(m?js)(\?v=\d+)?'", lambda g: f"'./{g.group(1)}.{g.group(2)}?v={s}'", t)
    if n != t: p.write_text(n, encoding='utf-8')
print('Stand', s)
