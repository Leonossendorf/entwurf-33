"""Baut die Standortkarte (assets/img/karte.svg) aus echten OpenStreetMap-Daten.
Ausschnitt: Niederrhein bis Gifhorn (seit 26.11.2026, damit alle Standorte auf der Karte liegen). Autobahnen, große Flüsse, Kanäle, Landes- und Staatsgrenze.
Aufruf: python tools/karte.py   (lädt einmal von der Overpass-Schnittstelle, Zwischenspeicher in tools/karte-roh.json)"""
import json, math, pathlib, sys, time, urllib.request, urllib.parse

root = pathlib.Path(__file__).resolve().parent.parent
RAW = root / 'tools' / 'karte-roh.json'
S, N, W, E = 51.22, 52.78, 6.15, 10.85         # Kartenausschnitt (muss zu js/start.js passen)
WIDTH = 1700
K = WIDTH / ((E - W) * math.cos(math.radians((S + N) / 2)))
HEIGHT = round((N - S) * K)

BB = f"{S - .03},{W - .03},{N + .03},{E + .03}"
TEILE = {
 'auto': f'[out:json][timeout:120][bbox:{BB}];way[highway=motorway];out tags geom;',
 'wasser': f'[out:json][timeout:120][bbox:{BB}];(way[waterway=river][name~"^(Rhein|Rijn|Waal|Nederrijn|IJssel|Ems|Lippe|Ruhr|Weser|Aller|Leine)$"];way[waterway=canal][name~"Dortmund-Ems-Kanal|Mittellandkanal|Rhein-Herne-Kanal|Wesel-Datteln-Kanal|Twentekanaal|Elbe-Seitenkanal"];);out tags geom;',
 'staat': f'[out:json][timeout:120];rel["ISO3166-1"="DE"][admin_level=2];way(r)({BB});out geom;',
 'land': f'[out:json][timeout:120];(rel["ISO3166-2"="DE-NW"];rel["ISO3166-2"="DE-NI"];);way(r)({BB});out geom;',
}
SERVER = ('https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter')

def lade():
    d = json.loads(RAW.read_text(encoding='utf-8')) if RAW.exists() else {}
    for name, q in TEILE.items():
        if name in d: continue
        for runde in range(3):
            for url in SERVER:
                try:
                    req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'Akquise-Recherche/1.0'})
                    with urllib.request.urlopen(req, timeout=150) as r:
                        d[name] = json.loads(r.read().decode('utf-8'))['elements']
                    RAW.write_text(json.dumps(d), encoding='utf-8'); print(name, 'von', url, len(d[name]), flush=True); break
                except Exception as e:
                    print('Fehler', name, url, e, file=sys.stderr, flush=True); time.sleep(3)
            if name in d: break
        if name not in d: sys.exit('Overpass nicht erreichbar: ' + name)
        time.sleep(2)
    return d

def xy(p):
    return ((p['lon'] - W) * math.cos(math.radians((S + N) / 2)) * K, (N - p['lat']) * K)

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop(); (x1, y1), (x2, y2) = pts[a], pts[b]; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9; m, mi = 0, -1
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - x1) - dx * (pts[i][1] - y1)) / L
            if d > m: m, mi = d, i
        if m > tol: keep[mi] = True; stack += [(a, mi), (mi, b)]
    return [p for p, k in zip(pts, keep) if k]

def pfad(ways, tol, minlen=0):
    out = []
    for w in ways:
        pts = [xy(p) for p in w['geometry']]
        if sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1)) < minlen: continue
        pts = dp(pts, tol)
        if not any(-40 < x < WIDTH + 40 and -40 < y < HEIGHT + 40 for x, y in pts): continue
        out.append('M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts))
    return ''.join(out)

d = lade()
t = lambda w: w.get('tags', {})
geo = lambda k: [e for e in d[k] if e['type'] == 'way' and 'geometry' in e]
auto = geo('auto'); wasser = geo('wasser')
fluss = [w for w in wasser if t(w).get('waterway') == 'river']
gross = [w for w in fluss if t(w).get('name') in ('Rhein', 'Rijn', 'Waal')]
klein = [w for w in fluss if w not in gross]
kanal = [w for w in wasser if t(w).get('waterway') == 'canal']
staat = geo('staat'); sid = {w['id'] for w in staat}
land = [w for w in geo('land') if w['id'] not in sid]

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}" fill="none" stroke-linecap="round" stroke-linejoin="round">
<rect width="{WIDTH}" height="{HEIGHT}" fill="#131518"/>
<path d="{pfad(land, 1.2)}" stroke="#3a3f46" stroke-width="1.4" stroke-dasharray="2 7"/>
<path d="{pfad(staat, 1.0)}" stroke="#6b727c" stroke-width="1.8" stroke-dasharray="9 6 2 6"/>
<path d="{pfad(kanal, 0.9, 6)}" stroke="#27455c" stroke-width="1.6"/>
<path d="{pfad(klein, 0.8, 4)}" stroke="#2f5f80" stroke-width="2.4"/>
<path d="{pfad(gross, 0.8, 4)}" stroke="#34709a" stroke-width="5"/>
<path d="{pfad(auto, 1.1, 5)}" stroke="#565c66" stroke-width="2.2"/>
</svg>'''
(root / 'assets' / 'img' / 'karte.svg').write_text(svg, encoding='utf-8')
print('karte.svg', len(svg) // 1024, 'KB', WIDTH, 'x', HEIGHT, '| Autobahn', len(auto), 'Fluss', len(fluss), 'Kanal', len(kanal), 'Staat', len(staat), 'Land', len(land))
