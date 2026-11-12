#!/usr/bin/env python3
"""
Construit assets/data/world.geo.json à partir de Natural Earth (topojson world-atlas 50m),
des états américains (us-atlas) et des provinces canadiennes.

Sortie : un FeatureCollection simplifié, où chaque entité porte un `id` stable
utilisé par les jeux de données historiques (assets/js/data/*.js).
"""
import json, math, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", ".cache")
OUT = os.path.join(ROOT, "assets", "data", "world.geo.json")
os.makedirs(CACHE, exist_ok=True)


def download(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print("↓", url)
        subprocess.run(["curl", "-sL", "-o", path, url], check=True)
    return path


# ---------------------------------------------------------------- topojson
def decode_topology(topo):
    tr = topo.get("transform")
    arcs = []
    for arc in topo["arcs"]:
        pts, x, y = [], 0, 0
        for p in arc:
            if tr:
                x += p[0]
                y += p[1]
                pts.append([x * tr["scale"][0] + tr["translate"][0],
                            y * tr["scale"][1] + tr["translate"][1]])
            else:
                pts.append([p[0], p[1]])
        arcs.append(pts)
    return arcs


def ring_from_arcs(arcs, indexes):
    out = []
    for i in indexes:
        a = arcs[i] if i >= 0 else list(reversed(arcs[~i]))
        out.extend(a[1:] if out else a)
    return out


def geometry_from_arcs(arcs, g):
    if g["type"] == "Polygon":
        return {"type": "Polygon", "coordinates": [ring_from_arcs(arcs, r) for r in g["arcs"]]}
    if g["type"] == "MultiPolygon":
        return {"type": "MultiPolygon",
                "coordinates": [[ring_from_arcs(arcs, r) for r in poly] for poly in g["arcs"]]}
    return None


def topo_features(path, layer):
    topo = json.load(open(path))
    arcs = decode_topology(topo)
    feats = []
    for g in topo["objects"][layer]["geometries"]:
        geom = geometry_from_arcs(arcs, g)
        if geom:
            feats.append({"properties": g.get("properties", {}), "id": g.get("id"), "geometry": geom})
    return feats


# ------------------------------------------------------------- simplification
def rdp(points, tol):
    if len(points) < 3:
        return points
    # simplification iterative par aire (Visvalingam-Whyatt light) sur anneaux fermés
    pts = points
    keep = [True] * len(pts)
    n = len(pts)
    # pile des segments à traiter
    stack = [(0, n - 1)]
    keep[0] = keep[-1] = True
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, best_i = -1.0, None
        for i in range(a + 1, b):
            px, py = pts[i]
            if norm == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * (px - ax) - dx * (py - ay)) / norm
            if d > best:
                best, best_i = d, i
        if best_i is not None and best > tol:
            keep[best_i] = True
            stack.append((a, best_i))
            stack.append((best_i, b))
        else:
            for i in range(a + 1, b):
                keep[i] = False
    return [p for p, k in zip(pts, keep) if k]


def simplify_ring(ring, tol):
    if len(ring) < 4:
        return None
    closed = ring[0] == ring[-1]
    body = ring[:-1] if closed else ring
    if len(body) < 3:
        return None
    out = rdp(body, tol)
    if len(out) < 3:
        return None
    out.append(out[0])
    return out


def simplify_geometry(geom, tol):
    def round_ring(r):
        r = simplify_ring(r, tol)
        if r is None:
            return None
        return [[round(x, 2), round(y, 2)] for x, y in r]

    if geom["type"] == "Polygon":
        rings = [x for x in (round_ring(r) for r in geom["coordinates"]) if x]
        return {"type": "Polygon", "coordinates": rings} if rings else None
    if geom["type"] == "MultiPolygon":
        polys = []
        for poly in geom["coordinates"]:
            rings = [x for x in (round_ring(r) for r in poly) if x]
            if rings:
                polys.append(rings)
        return {"type": "MultiPolygon", "coordinates": polys} if polys else None
    return None


# ---------------------------------------------------------------- helpers
def bbox(geom):
    xs, ys = [], []
    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c: walk(x)
    walk(geom["coordinates"])
    return [min(xs), min(ys), max(xs), max(ys)]


def area_approx(geom):
    b = bbox(geom)
    return (b[2] - b[0]) * (b[3] - b[1])


def split_multipolygon(geom, predicate):
    """Sépare un MultiPolygon en deux ensembles selon un prédicat sur la bbox du polygone."""
    if geom["type"] != "MultiPolygon":
        return [geom], []
    a, b = [], []
    for poly in geom["coordinates"]:
        sub = {"type": "Polygon", "coordinates": poly}
        (a if predicate(bbox(sub)) else b).append(poly)
    out = []
    for lst in (a, b):
        out.append({"type": "MultiPolygon", "coordinates": lst} if lst else None)
    return out


def poly_of(geom):
    if geom["type"] == "Polygon":
        return {"type": "MultiPolygon", "coordinates": [geom["coordinates"]]}
    return geom


# ---------------------------------------------------------------- inputs
w50 = download("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json", "w50.json")
us10 = download("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json", "us10.json")
canada = download("https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/canada.geojson", "canada.geojson")

countries = topo_features(w50, "countries")
us_states = topo_features(us10, "states")
canada_feats = json.load(open(canada))["features"]

# --- identifiants stables -------------------------------------------------
# pays Natural Earth (nom) -> id utilisé par les datasets
NAME_TO_ID = {
    "France": "france",
    "Algeria": "algerie",
    "Tunisia": "tunisie",
    "Morocco": "maroc",
    "Mauritania": "mauritanie",
    "Senegal": "senegal",
    "Mali": "mali",
    "Guinea": "guinee",
    "Côte d'Ivoire": "cote-divoire",
    "Burkina Faso": "burkina",
    "Niger": "niger",
    "Benin": "benin",
    "Togo": "togo",
    "Gabon": "gabon",
    "Congo": "congo",
    "Central African Rep.": "rca",
    "Chad": "tchad",
    "Cameroon": "cameroun",
    "Djibouti": "djibouti",
    "Madagascar": "madagascar",
    "Comoros": "comores",
    "Mauritius": "maurice",
    "Seychelles": "seychelles",
    "Egypt": "egypte",
    "Malta": "malte",
    "Belgium": "belgique",
    "Vietnam": "vietnam",
    "Laos": "laos",
    "Cambodia": "cambodge",
    "India": "inde",
    "Syria": "syrie",
    "Lebanon": "liban",
    "Vanuatu": "vanuatu",
    "Canada": "canada",
    "Haiti": "haiti",
    "St. Pierre and Miquelon": "st-pierre",
    "St-Barthélemy": "st-barthelemy",
    "St-Martin": "st-martin",
    "New Caledonia": "nouvelle-caledonie",
    "Fr. Polynesia": "polynesie",
    "Wallis and Futuna Is.": "wallis",
    "Fr. S. Antarctic Lands": "taaf",
    "United States of America": "usa",
    "United Kingdom": "royaume-uni",
    "Germany": "allemagne",
    "Italy": "italie",
    "Spain": "espagne",
    "Switzerland": "suisse",
    "Luxembourg": "luxembourg",
    "Netherlands": "pays-bas",
    "Brazil": "bresil",
    "Suriname": "suriname",
    "China": "chine",
}

# morceaux de la France d'outre-mer à extraire du multipolygone "France"
FRANCE_PARTS = [
    ("guyane", lambda b: b[0] < -50 and 1 < b[1] < 7),
    ("guadeloupe", lambda b: -62.0 < b[0] < -61.0 and 15.5 < b[1] < 16.7),
    ("martinique", lambda b: -61.5 < b[0] < -60.5 and 14.0 < b[1] < 15.5),
    ("reunion", lambda b: 55.0 < b[0] < 56.0 and -22.0 < b[1] < -20.0),
    ("mayotte", lambda b: 44.0 < b[0] < 46.0 and -13.5 < b[1] < -12.0),
    ("corse", lambda b: 8.0 < b[0] < 10.0 and 41.0 < b[1] < 43.5),
]

feats = []
stat = {"src": 0, "out": 0}

for c in countries:
    name = c["properties"].get("name", "")
    cid = NAME_TO_ID.get(name)
    geom = simplify_geometry(poly_of(c["geometry"]), 0.045)
    if geom is None:
        continue
    stat["src"] += 1

    if cid == "france":
        # métropole = le reste, hors Corse et hors outre-mer
        src = poly_of(c["geometry"])
        buckets = {pid: [] for pid, _ in FRANCE_PARTS}
        rest = []
        for poly in src["coordinates"]:
            b = bbox({"type": "Polygon", "coordinates": poly})
            for pid, pred in FRANCE_PARTS:
                if pred(b):
                    buckets[pid].append(poly)
                    break
            else:
                rest.append(poly)
        metas = [("metropole", {"type": "MultiPolygon", "coordinates": rest})]
        metas += [(pid, {"type": "MultiPolygon", "coordinates": g})
                  for pid, g in buckets.items() if g]
        for pid, g in metas:
            sg = simplify_geometry(poly_of(g), 0.03)
            if sg:
                feats.append({"id": pid, "name": pid, "country": "france", "geometry": sg})
        continue

    if cid == "taaf":
        a, b = split_multipolygon(poly_of(c["geometry"]), lambda bb: bb[0] > 130)
        for pid, g in (("terre-adelie", a), ("taaf", b)):
            if g:
                sg = simplify_geometry(poly_of(g), 0.03)
                if sg:
                    feats.append({"id": pid, "name": pid, "country": "france", "geometry": sg})
        continue

    feats.append({"id": cid or name.lower().replace(" ", "-"), "name": name,
                  "country": cid or None, "geometry": geom})

# --- États-Unis (pour la Louisiane) --------------------------------------
US_KEEP = {
    "05": "arkansas", "22": "louisiane-etat", "29": "missouri", "19": "iowa",
    "20": "kansas", "31": "nebraska", "46": "dakota-sud", "38": "dakota-nord",
    "40": "oklahoma", "27": "minnesota", "55": "wisconsin", "17": "illinois",
    "18": "indiana", "26": "michigan", "39": "ohio",
}
for s in us_states:
    sid = US_KEEP.get(str(s["id"]))
    if not sid:
        continue
    g = simplify_geometry(poly_of(s["geometry"]), 0.02)
    if g:
        feats.append({"id": "us-" + sid, "name": s["properties"].get("name", sid),
                      "country": "usa", "geometry": g})

# --- Canada (pour la Nouvelle-France) -----------------------------------
CA_KEEP = {
    "Quebec": "quebec", "Ontario": "ontario", "Manitoba": "manitoba",
    "New Brunswick": "nouveau-brunswick", "Nova Scotia": "nouvelle-ecosse",
    "Prince Edward Island": "ile-du-prince-edouard",
}
for f in canada_feats:
    n = f["properties"].get("name")
    if n not in CA_KEEP:
        continue
    g = simplify_geometry(poly_of(f["geometry"]), 0.02)
    if g:
        feats.append({"id": "ca-" + CA_KEEP[n], "name": n, "country": "canada", "geometry": g})

# --- Terre Adélie : absente de Natural Earth 50m, ajoutée à la main -------
ADELIE = {
    "type": "Polygon",
    "coordinates": [[
        [136.0, -66.2], [137.5, -66.55], [139.0, -66.6], [140.5, -66.65],
        [142.0, -66.7], [142.0, -69.5], [136.0, -69.5], [136.0, -66.2],
    ]],
}
feats.append({"id": "terre-adelie", "name": "Terre Adélie", "country": "france", "geometry": ADELIE})

# ---------------------------------------------------------------- output
def clean(f):
    out = {"id": f["id"], "name": f["name"], "geometry": f["geometry"]}
    if f.get("country"):
        out["country"] = f["country"]
    return out

feats = [f for f in feats if f.get("geometry")]
collection = {"type": "FeatureCollection", "features": [clean(f) for f in feats]}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(collection, fh, separators=(",", ":"))
size = os.path.getsize(OUT)
print(f"{len(feats)} entités → {OUT} ({size/1024:.0f} Ko)")
