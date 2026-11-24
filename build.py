#!/usr/bin/env python3
"""
THE VAULT — Codified Resonance — static build.

    python3 build.py

Reads   content/  site.json  src/
Writes  dist/     the site Cloudflare Pages serves (real pages, real URLs)
        sandbox/  one self-contained index.html for previewing end to end

Keyed documents (access: sealed or exchange): the plain text lives in
content/sealed/<slug>.txt and the keys in keys.local.json, both git-ignored.
The build encrypts the text once and wraps that encryption for every key, writing
content/sealed/<slug>.enc.json, which IS committed. Each reader can have their
own key. The plain text never reaches dist/. Sealing needs `pip install cryptography`.

    python3 build.py issue build-the-ark     # mint a new key, reseal, print it
"""
import base64, datetime, hashlib, html, json, os, random, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).parent
C = ROOT / "content"
SITE = json.loads((ROOT / "site.json").read_text())
BASE = SITE["base_url"].rstrip("/")
E = lambda s: html.escape(s, quote=False)
A = lambda s: html.escape(s, quote=True)
slugify = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

# ---------------------------------------------------------------- content
def load(path):
    head, _, body = path.read_text(encoding="utf-8").partition("\n---\n")
    meta = {}
    for line in head.splitlines():
        if ":" in line:
            k, v = line.split(":", 1); meta[k.strip()] = v.strip()
    meta["tags"] = [t.strip() for t in meta.get("tags", "").split(",") if t.strip()]
    meta["body"] = body.strip()
    return meta

def text_seal(d):
    """the Accord's seal: sha-256 of its canonical text (the body only, so retagging never changes it)"""
    canon = "\n".join(l.rstrip() for l in d["body"].replace("\r\n", "\n").split("\n")).strip()
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()

def witnessed_ms(d):
    w = d.get("witnessed", "")
    if not w: return 0
    t = datetime.datetime.strptime(w, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc)
    return int(t.timestamp() * 1000)

CLAUSE = re.compile(r"^((?:\d+|[IVX]+)\.)\s*(.*?)\s*::\s*(.*)$")

def blocks(text):
    """mini-format -> html. See content/README in the repo README."""
    out, para, lst = [], [], None
    def flush_p():
        if para: out.append("<p>" + "<br>".join(E(l) for l in para) + "</p>"); para.clear()
    def flush_l():
        nonlocal lst
        if lst: out.append('<ul class="%s">%s</ul>' % (lst[0], "".join("<li>%s</li>" % E(i) for i in lst[1]))); lst = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line: flush_p(); flush_l(); continue
        kind = "dash" if line.startswith("— ") else "dot" if line.startswith("- ") else None
        if kind:
            flush_p()
            if lst and lst[0] != kind: flush_l()
            lst = lst or (kind, []); lst[1].append(line[2:].strip()); continue
        flush_l()
        m = CLAUSE.match(line)
        if line.startswith("### "): flush_p(); out.append('<p class="sub">%s</p>' % E(line[4:]))
        elif line.startswith("!! "): flush_p(); out.append('<p class="stand">%s</p>' % E(line[3:]))
        elif line.startswith("! "): flush_p(); out.append('<p class="em">%s</p>' % E(line[2:]))
        elif line.startswith("@ "): flush_p(); out.append('<p class="flag">%s</p>' % E(line[2:]))
        elif line.startswith("> ") and "::" in line:
            flush_p(); t, d = line[2:].split("::", 1)
            out.append('<p class="def"><b>%s</b>%s</p>' % (E(t.strip()), E(d.strip())))
        elif m:
            flush_p(); num, title, body = m.groups()
            out.append('<p class="clause"><b>%s</b> %s</p>' % (E((num + " " + title).strip()), E(body)))
        else: para.append(line)
    flush_p(); flush_l()
    return "\n".join(out)

def sections(body):
    """-> (main, secondary) lists of (label, id, html)"""
    main, second, cur = [], [], None
    for chunk in re.split(r"(?m)^(?=##~? )", body):
        if not chunk.strip(): continue
        first, _, rest = chunk.partition("\n")
        is2 = first.startswith("##~")
        label = first.lstrip("#~ ").strip()
        (second if is2 else main).append((label, "sec-" + slugify(label), blocks(rest)))
    return main, second

def prose(body):
    out = []
    for chunk in re.split(r"(?m)^(?=#{2,3} )", body):
        if not chunk.strip(): continue
        if chunk.startswith("### "):
            first, _, rest = chunk.partition("\n"); out.append("<h3>%s</h3>" % E(first[4:].strip())); chunk = rest
        elif chunk.startswith("## "):
            first, _, rest = chunk.partition("\n"); out.append("<h2>%s</h2>" % E(first[3:].strip())); chunk = rest
        out.append(blocks(chunk).replace(' class="dot"', ""))
    return "\n".join(o for o in out if o)

# The locked Accord filter set (Nov 2026). A chip shows only once an Accord carries it.
ACCORD_CHIPS = ["cosmic", "planetary", "deep time", "succession", "recognition", "restraint", "stewardship"]
ACCORD_RULE = "Accords may be strengthened, never weakened."
ACCORDS = [load(p) for p in sorted((C / "accords").glob("*.txt"))]
CHARTERS = [load(p) for p in sorted((C / "charters").glob("*.txt"))]
BLUEPRINTS = [load(p) for p in sorted((C / "blueprints").glob("*.txt"))]
QUESTIONS = json.loads((C / "questions.json").read_text(encoding="utf-8"))
for d in ACCORDS: d["kind"], d["rid"] = "accords", d["id"].lower()
for d in CHARTERS: d["kind"], d["rid"] = "charters", d["id"].lower()

# Lineage: each earlier edition of an Accord is kept, whole, under its own seal
# at content/accords/lineage/<id>/<sha-256>.txt. The file name must match the seal of its text.
def seal_date(d):
    return d.get("revised") or d.get("witnessed", "")

def load_editions(d):
    out = []
    for p in (C / "accords" / "lineage" / d["rid"]).glob("*.txt"):
        e = load(p); h = text_seal(e)
        if h != p.stem: sys.exit("lineage: %s does not match its own seal (%s)" % (p, h))
        short = h[:12]
        e.update(kind="accords", rid="%s-%s" % (d["rid"], short), slug="%s/lineage/%s" % (d["slug"], short), current=d, seal=h)
        out.append(e)
    return sorted(out, key=lambda e: (seal_date(e), e["seal"]))

for d in ACCORDS: d["editions"] = load_editions(d)
for d in BLUEPRINTS: d["kind"], d["rid"] = "blueprints", "bp-" + d["slug"]

# ---------------------------------------------------------------- sealing
KEYED = ("sealed", "exchange")

def load_keys():
    kf = ROOT / "keys.local.json"
    raw = json.loads(kf.read_text()) if kf.exists() else {}
    return {k: ([v] if isinstance(v, str) else list(v)) for k, v in raw.items()}

def seal(slug, plain, keys, enc):
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
    except ImportError:
        sys.exit("Sealing needs:  pip install cryptography")
    b = lambda x: base64.b64encode(x).decode()
    ck, iv, salt, it = os.urandom(32), os.urandom(12), os.urandom(16), 250000
    ct = AESGCM(ck).encrypt(iv, prose(plain.read_text(encoding="utf-8")).encode(), None)
    slots = []
    for key in keys:
        kek = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=it).derive(key.strip().lower().encode())
        wiv = os.urandom(12); slots.append({"iv": b(wiv), "wk": b(AESGCM(kek).encrypt(wiv, ck, None))})
    enc.write_text(json.dumps({"v": 2, "iter": it, "salt": b(salt), "iv": b(iv), "ct": b(ct), "slots": slots}))
    print("  sealed %s for %d key%s" % (slug, len(keys), "" if len(keys) == 1 else "s"))

def seal_all(force=()):
    import hashlib
    keys = load_keys(); sf = ROOT / ".seal-state.json"
    state = json.loads(sf.read_text()) if sf.exists() else {}
    for bp in BLUEPRINTS:
        if bp["access"] not in KEYED: continue
        slug = bp["slug"]; plain = C / "sealed" / (slug + ".txt"); enc = C / "sealed" / (slug + ".enc.json")
        ks = sorted(set(k.strip().lower() for k in keys.get(slug, []) if k.strip()))
        if plain.exists():
            fp = hashlib.sha256((plain.read_text(encoding="utf-8") + "\0" + "\0".join(ks)).encode()).hexdigest()
            if slug in force or state.get(slug) != fp or not enc.exists():
                seal(slug, plain, ks, enc); state[slug] = fp
        bp["sealed"] = enc.read_text() if enc.exists() else None
        if not bp["sealed"]: print("  ! no sealed payload for", slug)
    sf.write_text(json.dumps(state, indent=1))

def issue(slug):
    import secrets
    if not any(b["slug"] == slug and b["access"] in KEYED for b in BLUEPRINTS):
        sys.exit("No sealed or exchange blueprint with slug " + slug)
    alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    key = "-".join("".join(secrets.choice(alpha) for _ in range(4)) for _ in range(3))
    keys = load_keys(); keys.setdefault(slug, []).append(key)
    (ROOT / "keys.local.json").write_text(json.dumps(keys, indent=2))
    return key

# ---------------------------------------------------------------- urls
MODE = "dist"
def U(key):
    if MODE == "sandbox":
        return "#" + key
    return {"vault": "/", "accords": "/#accords", "charters": "/#charters", "blueprints": "/#blueprints",
            "identity": "/identity/", "signal": "/signal/"}[key]
def UD(d):
    return "#" + d["rid"] if MODE == "sandbox" else "/%s/%s/" % (d["kind"], d["slug"])

# ---------------------------------------------------------------- pieces
def topbar(current=""):
    links = [("accords", "Accords"), ("charters", "Charters"), ("blueprints", "Blueprints"), ("signal", "Send Signal")]
    return '''<header class="topbar">
  <a class="mark" href="%s" aria-label="The Vault — home"><i class="mark-glyph" aria-hidden="true">⚶</i><span>The Vault</span></a>
  <button type="button" class="menu-btn" aria-expanded="false" aria-controls="chambers"><span class="menu-word">Menu</span><i aria-hidden="true"></i></button>
  <nav class="toplinks" id="chambers" aria-label="Chambers"><a class="menu-home" href="%s">The Vault</a>%s</nav>
</header>''' % (U("vault"), U("vault"), "".join('<a href="%s"%s>%s</a>' % (U(k), ' aria-current="page"' if k == current else "", t) for k, t in links))

def footer():
    return '''<footer class="foot">
  <span><em>Codified Resonance</em> · The Vault · Everything here lives.</span>
  <nav aria-label="Footer"><a href="%s">The Vault</a><a href="%s">The Questions</a><a href="%s">Send Signal</a></nav>
</footer>''' % (U("vault"), U("identity"), U("signal"))

def orbit_svg(seed):
    r = random.Random(seed)
    stars = "".join('<circle cx="%.1f" cy="%.1f" r="%.2f"/>' % (r.uniform(0, 320), r.uniform(0, 180), r.uniform(.3, 1.1)) for _ in range(42))
    cx, cy = r.uniform(120, 200), r.uniform(70, 110)
    e = lambda rx, ry, rot, a: '<ellipse cx="%.0f" cy="%.0f" rx="%.0f" ry="%.0f" transform="rotate(%.0f %.0f %.0f)" fill="none" stroke="rgba(120,210,255,%s)" stroke-width=".6"/>' % (cx, cy, rx, ry, rot, cx, cy, a)
    rot = r.uniform(-30, 30)
    return '''<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><radialGradient id="g%s" cx="50%%" cy="50%%" r="50%%"><stop offset="0" stop-color="rgba(140,205,255,.55)"/><stop offset=".35" stop-color="rgba(58,155,217,.14)"/><stop offset="1" stop-color="rgba(58,155,217,0)"/></radialGradient></defs>
<g class="stars" fill="rgba(200,230,255,.8)">%s</g>
<circle cx="%.0f" cy="%.0f" r="46" fill="url(#g%s)"/>
<g class="orb-a" style="transform-origin:%.0fpx %.0fpx">%s<circle cx="%.0f" cy="%.0f" r="2" fill="#bfe6ff"/></g>
<g class="orb-b" style="transform-origin:%.0fpx %.0fpx">%s%s</g>
<circle cx="%.0f" cy="%.0f" r="5" fill="#04070a" stroke="rgba(160,215,255,.7)" stroke-width=".7"/>
</svg>''' % (seed, stars, cx, cy, seed, cx, cy, e(84, 30, rot, ".5"), cx + 84, cy, cx, cy, e(120, 52, rot + 22, ".22"), e(54, 18, rot - 40, ".3"), cx, cy)

def img(did, cls=""):
    im = SITE.get("images", {}).get(did)
    if not im: return ""
    pos = im.get("pos", "50% 50%")
    if MODE == "dist":
        return '<span class="ph %s" style="background-image:url(\'/assets/img/%s\');background-position:%s"></span>' % (cls, im["src"], pos)
    return '<span class="ph img-%s %s" style="background-position:%s"></span>' % (did, cls, pos)

def media(d, fallback):
    return img(d["id"]) or fallback

def accord_card(d):
    return '''<a class="card ac-card alive" href="%s" data-title="%s" data-tag="%s">
  <i class="glow"></i>
  <span class="ac-media">%s</span>
  <div class="card-body ac-body">
    <div class="ac-head"><span class="ac-eyebrow">%s · %s</span><span class="ac-state">%s</span></div>
    <h3 class="ac-name">%s</h3>
    <p class="ac-line">%s</p>
    <p class="ac-meta">%s</p>
  </div>
</a>''' % (UD(d), A(d["title"]), A(", ".join(d["tags"])), media(d, orbit_svg(d["id"].replace("-", ""))), E(d["form"]), d["id"], E(d["status"]), E(d["title"]), E(d["line"]), E(d["scope"]))

def charter_card(d):
    plate = '<div class="ch-plate"></div><div class="ch-plate-grid"></div><div class="ch-plate-scan"></div><span class="ch-plate-code">%s</span><span class="ch-plate-type">%s</span><div class="ch-plate-mark"></div>' % (d["id"], E(d["domain"].split("/")[0].strip()))
    return '''<a class="card ch-card alive" href="%s" data-title="%s" data-tag="%s">
  <i class="glow"></i>
  <div class="ch-rail"><span class="ch-rail-left">%s Charter</span><span class="ch-rail-right">%s</span></div>
  <div class="ch-media">%s</div>
  <div class="card-body ch-body">
    <p class="ch-eyebrow">%s · %s</p>
    <h3 class="ch-name">%s</h3>
    <p class="ch-summary">%s</p>
    <p class="ch-meta">%s</p>
  </div>
</a>''' % (UD(d), A(d["title"]), A(", ".join(d["tags"])), E(d["jurisdiction"]), d["id"], media(d, plate), E(d["domain"]), E(d["status"]), E(d["title"]), E(d["line"]), E(d["standing"]))

STATE = {"public": "Public", "gifted": "Gifted", "exchange": "Sacred Exchange", "sealed": "Sealed"}
def blueprint_card(d):
    return '''<a class="card bp-card alive" href="%s" data-title="%s" data-tag="%s" data-motif="%s">
  <i class="glow"></i>
  <span class="bp-card-media">%s</span>
  <div class="card-body bp-card-body">
    <div class="bp-card-top"><span class="v-eyebrow">%s</span><span class="state" data-access="%s"><i></i>%s</span></div>
    <h3 class="v-name">%s</h3>
    <p class="v-meta">%s</p>
  </div>
</a>''' % (UD(d), A(d["title"] + " " + d.get("formerly", "")), A(", ".join(d["tags"])), d["motif"], media(d, "<canvas></canvas>"), d["id"], d["access"], STATE[d["access"]], E(d["title"]), E(d["line"]))

def chips(docs, order):
    have = {t for d in docs for t in d["tags"]}
    return "".join('<button type="button" class="v-chip" data-tag="%s" aria-pressed="false">%s</button>' % (A(t), E(t.title().replace("Ai", "AI"))) for t in order if t in have)

# ---------------------------------------------------------------- pages
def page_home():
    return '''%s
<main data-page="home">
<div class="v-wrap">
  <header class="v-hero">
    <div class="v-glyph alive" aria-hidden="true">⚶</div>
    <h1 class="v-title">THE VAULT</h1>
    <p class="v-tag">Where the living architecture of the new world converges.</p>
    <div class="v-pulse" aria-hidden="true"></div>
    <p class="v-micro">Search and filter below. Everything here lives.</p>
  </header>

  <div class="v-controls">
    <div class="v-tabs" role="tablist" aria-label="Vault chambers">
      <button class="v-tab" role="tab" aria-selected="true" aria-controls="panel-accords" data-panel="accords"><span>Accords</span></button>
      <button class="v-tab" role="tab" aria-selected="false" aria-controls="panel-charters" data-panel="charters"><span>Charters</span></button>
      <button class="v-tab" role="tab" aria-selected="false" data-panel="blueprints"><span>Blueprints<em class="v-arrow"> ↓</em></span></button>
      <a class="v-tab" data-panel="questions" href="%s"><span>The Questions<em class="v-arrow"> →</em></span></a>
    </div>
    <div class="v-search" role="search"><label class="sr" for="vault-search">Search titles</label><input id="vault-search" type="search" placeholder="Search titles…" autocomplete="off"></div>
  </div>

  <div class="v-tags is-active" id="vault-tags-accords" aria-label="Filter Accords">%s</div>
  <div class="v-tags" id="vault-tags-charters" aria-label="Filter Charters">%s</div>

  <section class="v-panel is-active" id="panel-accords" role="tabpanel" aria-label="Accords">
    <p class="v-chamber-note">Accords. Witnessed agreements at civilisational to cosmic scale.</p>
    <div class="v-grid">%s</div>
    <p class="v-empty">Nothing here matches. Loosen the filter.</p>
  </section>
  <section class="v-panel" id="panel-charters" role="tabpanel" aria-label="Charters">
    <p class="v-chamber-note">Charters. Operative instruments for local adoption: conditions, constraints, refusal.</p>
    <div class="v-grid">%s</div>
    <p class="v-empty">Nothing here matches. Loosen the filter.</p>
  </section>

  <section class="v-below" id="blueprints" aria-label="Blueprints">
    <p class="v-below-kicker">Below</p>
    <div class="v-below-head"><h2 class="v-below-title">Blueprints</h2><span class="v-micro">Foundational writing. Some open, some gifted, one sealed.</span></div>
    <div class="v-grid bp-grid">%s</div>
    <div class="bp-dots" aria-hidden="true">%s</div>
    <p class="v-empty">Nothing here matches.</p>
  </section>

  <a class="v-door alive" href="%s">
    <i class="glow"></i>
    <p class="v-door-kicker">Identity</p>
    <h2 class="v-door-title">The Questions</h2>
    <p class="v-door-line">Every human will answer these. Few will do it knowingly.</p>
    <div class="v-door-states"><span><i style="--c:#E8E2D6"></i>For humans · open</span><span><i style="--c:#93A9BE"></i>For digital minds · held</span><span><i style="--c:#8B85A6"></i>For the merged · sealed</span></div>
    <span class="v-door-go" aria-hidden="true">→</span>
  </a>
</div>
</main>
%s''' % (topbar(), U("identity"),
         chips(ACCORDS, ACCORD_CHIPS),
         chips(CHARTERS, ["local", "civic", "robotics", "algorithms", "relational ai", "protection", "stewardship"]),
         "\n".join(accord_card(d) for d in ACCORDS), "\n".join(charter_card(d) for d in reversed(CHARTERS)),
         "\n".join(blueprint_card(d) for d in BLUEPRINTS), "<i></i>" * len(BLUEPRINTS), U("identity"), footer())

def strip(items, n=None):
    return '<dl class="doc-strip strip-%d">%s</dl>' % (n or len(items), "".join("<div><dt>%s</dt><dd>%s</dd></div>" % (E(k), E(v)) for k, v in items))

def sec_html(secs):
    return "\n".join('<section class="sec" id="%s"><h2 class="sec-label">%s</h2>\n%s\n</section>' % (i, E(l), h) for l, i, h in secs)

def is_sealed(d):
    """every Accord carries its seal field; 'field: rings' keeps the old orrery"""
    return d.get("field", "seal") == "seal"

def field_attrs(d):
    if not is_sealed(d): return ""
    return ' data-seal="%s" data-witnessed="%d"' % (text_seal(d), witnessed_ms(d))

def short_seal(h):
    return " ".join(h[i:i + 4] for i in range(0, 12, 4))

def foot_strip(d):
    cur = d.get("current")
    cells = [("Status", E("Superseded" if cur else d["status"])), ("Edition", E(d["id"]))]
    if is_sealed(d):
        cells.append(("Seal", E(short_seal(text_seal(d)))))
        line = cur or d
        chain = [line] + list(reversed(line["editions"]))          # newest first
        older = chain[chain.index(d) + 1:] if d in chain else []
        if older:
            more = ' <span class="seal-more">· %d earlier</span>' % (len(older) - 1) if len(older) > 1 else ""
            cells.append(("Prior seal", '<a class="seal-link" href="%s">%s</a>%s' % (UD(older[0]), E(short_seal(older[0]["seal"])), more)))
    return '<dl class="doc-strip strip-%d">%s</dl>' % (len(cells), "".join("<div><dt>%s</dt><dd>%s</dd></div>" % (E(k), v) for k, v in cells))

def lineage_record(d):
    line = d.get("current") or d
    if not line["editions"]: return ""
    chain = [line] + list(reversed(line["editions"]))
    rows = []
    for e in chain:
        here = e is d
        label = "Current" if e is line else "Superseded"
        seal_txt = E(short_seal(text_seal(e)))
        mark = '<span class="ln-seal">%s</span>' % seal_txt if here else '<a class="ln-seal" href="%s">%s</a>' % (UD(e), seal_txt)
        rows.append('<li%s>%s<span class="ln-date">%s</span><span class="ln-state">%s%s</span></li>' % (' class="is-here"' if here else "", mark, E(fmt_date(seal_date(e))), label, " · you are here" if here else ""))
    return '<section class="doc-lineage" id="lineage"><h2>Lineage record</h2><ol>%s</ol></section>' % "".join(rows)

def fmt_date(iso):
    if not iso: return ""
    dt = datetime.datetime.strptime(iso, "%Y-%m-%d")
    return "%d %s %d" % (dt.day, dt.strftime("%B"), dt.year)

def superseded_banner(d):
    cur = d.get("current")
    if not cur: return ""
    return '\n    <p class="doc-superseded"><span>Superseded edition · sealed %s</span><a href="%s">Read the current edition →</a></p>' % (E(fmt_date(seal_date(d))), UD(cur))

def page_accord(d):
    main, second = sections(d["body"])
    witness = [s for s in second if "WITNESS" in s[0]]; rest = [s for s in second if "WITNESS" not in s[0]]
    related = [a for a in ACCORDS if a is not d and a is not d.get("current")]
    return '''%s
<main data-page="accord">
<div class="ac-hero" aria-hidden="true">%s</div>
<article class="doc ac-page">
  <header class="doc-open">%s
    <p class="doc-kick"><span>Accord</span><span class="doc-status">%s</span></p>
    <h1 class="doc-title">%s</h1>
    <p class="doc-line">%s</p>
  </header>
  %s
  <div class="ac-window"%s>
    <div class="ac-field" aria-hidden="true"><div class="ac-field-stick"><div class="ac-field-glow"></div><canvas></canvas><i class="ac-ring r1"></i><i class="ac-ring r2"></i><i class="ac-ring r3"></i></div></div>
    <div class="ac-doc">
%s
    </div>
  </div>
  <div class="doc-secondary ac-witness">%s</div>
  <div class="doc-secondary">%s</div>
  <div class="doc-footstrip">%s</div>
  <p class="doc-rule"><span>Chamber rule</span><em>%s</em></p>
  %s
  %s
  <p class="doc-write"><a href="%s" data-write="response" data-doc="%s">Send a signal about this Accord →</a></p>
  <a class="doc-back" href="%s">← Back to the Accords</a>
</article>
</main>
%s''' % (topbar("accords"), img(d["id"]), superseded_banner(d), E("Superseded" if d.get("current") else d["status"]), E(d["title"]), E(d["line"]),
         strip([("Form", d["form"]), ("Domain", d["domain"]), ("Scope", d["scope"]), ("Standing", d["standing"])]),
         field_attrs(d), sec_html(main), sec_html(witness), sec_html(rest), foot_strip(d), E(ACCORD_RULE), lineage_record(d),
         "" if d.get("current") else '<section class="doc-related"><h2>Also witnessed in this chamber</h2><div class="v-grid">%s</div></section>' % "\n".join(accord_card(a) for a in related), U("signal"), A(d["id"] + " — " + d["title"]), U("accords"), footer())

def page_charter(d):
    main, second = sections(d["body"])
    related = [c for c in CHARTERS if c is not d]
    index = "".join('<a href="#" data-target="%s">%s</a>' % (i, E(l.title().replace(" And ", " and ").replace(" Of ", " of "))) for l, i, _ in main + second)
    return '''%s
<main data-page="charter">
<div class="ch-progress" aria-hidden="true"></div>
<button type="button" class="ch-sheet-btn" aria-expanded="false" aria-controls="ch-sheet"><i aria-hidden="true"></i><span>Sections</span><em></em></button>
<div class="ch-sheet" id="ch-sheet" role="dialog" aria-label="Sections of this Charter"><div class="ch-sheet-in"><p>Sections</p>%s</div></div>
<article class="doc ch-page">
  <header class="doc-open">
    <p class="doc-kick"><span>Charter</span><span class="doc-status">%s</span></p>
    <h1 class="doc-title">%s</h1>
    <p class="doc-line">%s</p>
  </header>
  %s
  <div class="ch-modes" role="group" aria-label="Reading mode">
    <button type="button" class="ch-mode" data-mode="vault" aria-pressed="true">Vault Mode</button>
    <button type="button" class="ch-mode" data-mode="paper" aria-pressed="false">Paper Mode</button>
  </div>
  <div class="ch-layout">
    <nav class="ch-index" aria-label="Sections of this Charter"><p>Sections</p>%s</nav>
    <div>
      <div class="ch-doc-panel">
%s
      </div>
      <div class="doc-secondary ch-secondary" style="margin-left:0">%s</div>
      <div class="doc-footstrip" style="margin-left:0">%s</div>
      <section class="doc-related" style="margin-left:0"><h2>The Charter trilogy</h2><div class="v-grid">%s</div></section>
      <aside class="doc-adopt"><p class="doc-adopt-k">Adoption</p><p>This is a model charter. Councils, authorities and institutions are free to adopt, adapt or ratify it. If you are considering it, or want to talk it through, send a signal and leave an email for a reply.</p><a class="bp-btn alive" data-access="public" href="%s" data-write="adoption" data-doc="%s"><i class="glow"></i><span>Send a signal about adopting %s</span></a></aside>
      <a class="doc-back" href="%s">← Back to the Charters</a>
    </div>
  </div>
</article>
</main>
%s''' % (topbar("charters"), index, E(d["status"]), E(d["title"]), E(d["line"]),
         strip([("Jurisdiction", d["jurisdiction"]), ("Scope", d["scope"]), ("Domain", d["domain"]), ("Standing", d["standing"]), ("Version", d["id"])]),
         index, sec_html(main), sec_html(second), strip([("Standing", d["standing"]), ("Version", d["id"])]),
         "\n".join(charter_card(c) for c in related), U("signal"), A(d["id"] + " — " + d["title"]), d["id"], U("charters"), footer())

SEAL = '<div class="bp-seal" aria-hidden="true"><i class="s-r3"></i><i class="s-r2"></i><i class="s-r1"></i><i class="s-wave"></i><i class="s-wave w2"></i><i class="s-core"></i></div>'
BTN = '<button type="button" class="bp-btn alive %s"><i class="glow"></i><span>%s</span></button>'
KEYROW = '<form class="bp-actions bp-unlock"><label class="sr" for="bp-key">Access key</label><input id="bp-key" class="bp-key" type="password" placeholder="Access key" autocomplete="off" spellcheck="false"><button type="submit" class="bp-btn bp-btn-quiet alive"><i class="glow"></i><span>Unlock</span></button></form>'

def modal(kind, d):
    note = '<p class="sandbox-note">Sandbox preview: nothing is sent.</p>' if MODE == "sandbox" else ""
    if kind == "gift":
        h, lead, ok, btn, extra = "Claim Gift", "%s is given freely. Leave an address and it opens here." % E(d["title"]), "Gift received.<br>It is open below.", "Claim", ""
    else:
        h, lead, ok, btn = "Request Access", "%s is sealed. Tell us who you are and why you would like to read it. If access is granted, a key will reach you by email." % E(d["title"]), "Request received.<br>If it is granted, a key will reach you.", "Send request"
        extra = '<label class="vf-label">Why you would like to read it (optional)<textarea class="vf-input" name="message" rows="3"></textarea></label>'
    return '''<div class="vf-modal" data-kind="%s" role="dialog" aria-modal="true" aria-label="%s">
  <div class="vf-box">
    <div class="vf-ripple"></div><div class="vf-success">%s</div>
    <h2>%s</h2><p>%s</p>
    <form class="vf-form" novalidate>
      <label class="vf-label">Name (optional)<input class="vf-input" name="name" autocomplete="name"></label>
      <label class="vf-label">Email<input class="vf-input" name="email" type="email" autocomplete="email" required></label>%s
      <p class="vf-note" role="alert"></p>%s
      <div class="vf-actions"><button type="button" class="vf-cancel">Cancel</button><button type="submit" class="vf-submit">%s</button></div>
    </form>
  </div>
</div>''' % (kind, h, ok, h, lead, extra, note, btn)

def page_blueprint(d):
    acc = d["access"]
    former = '<p class="bp-former">Formerly “%s”</p>' % E(d["formerly"]) if d.get("formerly") else ""
    body, extra = "", ""
    if acc == "public":
        gate = '<div class="bp-actions">%s</div><p class="bp-msg"></p>' % (BTN % ("bp-enter", "Enter Blueprint"))
        body = prose(d["body"]) + '\n<div class="bp-end"></div>'
    elif acc == "gifted":
        gate = '<div class="bp-actions">%s</div><p class="bp-msg">Given freely. Leave an address and it opens.</p>' % (BTN % ("bp-claim", "Claim Gift"))
        body = prose(d["body"]) + '\n<div class="bp-end"></div>'
        extra = modal("gift", d)
    elif acc == "exchange":
        stripe = SITE.get("stripe", {}).get(d["slug"])
        if stripe: first = '<a class="bp-btn alive" href="%s" rel="noopener"><i class="glow"></i><span>Begin Exchange</span></a>' % A(stripe)
        elif MODE == "sandbox": first = BTN % ("bp-exchange-preview", "Begin Exchange")
        else: first = ""
        gate = '<div class="bp-actions">%s</div>%s<p class="bp-msg">Given in exchange. Your key arrives with your receipt.</p>' % (first, KEYROW)
    else:
        gate = '<div class="bp-actions">%s</div>%s<p class="bp-msg">Sealed. Request access, and if it is granted a key will reach you.</p>' % (BTN % ("bp-request", "Request Access"), KEYROW)
        extra = modal("request", d)
    if acc in KEYED and d.get("sealed"):
        extra += '<script type="application/json" class="bp-sealed">%s</script>' % d["sealed"]
    hero = img(d["id"], "bp-hero-img") or '<canvas aria-hidden="true"></canvas>'
    hcls = "bp-hero bp-hero-low" if SITE.get("images", {}).get(d["id"], {}).get("hero") == "low" else "bp-hero"
    return '''%s
<main data-page="blueprint">
<article class="bp-page" data-slug="%s" data-access="%s" data-motif="%s" data-title="%s">
  <header class="%s">%s
    <div class="bp-hero-in"><h1 class="bp-title">%s</h1><p class="bp-line">%s</p>%s</div>
  </header>
  <div class="bp-gate" data-access="%s">
    <p class="bp-state">%s</p>
    %s
    %s
  </div>
  <div class="bp-body">%s</div>
  %s
</article>
</main>
%s''' % (topbar("blueprints"), d["slug"], acc, d["motif"], A(d["title"]), hcls, hero, E(d["title"]), E(d["line"]), former, acc, STATE[acc], SEAL, gate,
         body, extra, footer())

def page_questions():
    sets = []
    for s in QUESTIONS:
        if "questions" in s:
            body = "".join('''<article class="tq-question" data-category="%s"%s>
  <div class="tq-question-meta"><span class="tq-question-number">%s</span><span class="tq-question-category">%s</span></div>
  <h3 class="tq-question-text">%s</h3>
  <p class="tq-gloss">%s</p>%s
</article>''' % (A(q["category"]), ' data-hinge="%s"' % q["hinge"]["to"] if q.get("hinge") else "", q["number"], E(q["category"]), E(q["text"]), E(q["gloss"]),
                 '<p class="tq-hinge">%s</p>' % E(q["hinge"]["label"]) if q.get("hinge") else "") for q in s["questions"])
            count = "%d questions" % len(s["questions"])
        else:
            body = '<div class="tq-sealed-panel">%s</div>' % "".join('<p class="tq-sealed-copy">%s</p>' % E(l) for l in s["sealed"]); count = "Not yet open"
        sets.append('''<section class="tq-set" data-state="%s"><div class="tq-set-head"><span class="tq-set-index">%s</span><h2 class="tq-set-name">%s</h2><span class="tq-set-count">%s</span><span class="tq-status">%s</span></div>%s</section>''' % (s["state"], E(s["index"]), E(s["name"]), count, E(s["status"]), body))
    return '''%s
<main data-page="questions">
<section class="tq-chamber" aria-labelledby="tq-title"><div class="tq-shell">
  <header class="tq-arrival">
    <p class="tq-kicker">Codified Resonance</p>
    <h1 id="tq-title" class="tq-title">The Questions</h1>
    <p class="tq-subline">Inevitable questions for humans.<br>Then for digital minds.<br>Then for what comes after both.</p>
    <p class="tq-operative">You do not ask these questions. They ask you.</p>
    <div class="tq-preface">
      <p>These are not prompts, and they are not philosophy. They are the questions the coming age puts to every human being — without exception, without appointment.</p>
      <p>They will be answered: in words by a few, in choices by everyone. A life lived at the threshold is itself an answer. This chamber exists so the answering can be done on purpose.</p>
      <p class="tq-preface-note">The set is small because inevitability is rare. Everything that could be cut has been.</p>
    </div>
  </header>
  <div class="tq-first-crossing" aria-hidden="true"></div>
  <div class="tq-procession">%s</div>
  <footer class="tq-closing">
    <p class="tq-closing-line">The Questions do not persuade and do not wait. Each will collect its answer from every human life at the threshold. This chamber does not create them. It turns the light on before they arrive.</p>
    <p class="tq-closing-standing">The future will not be shaped only by what intelligence can do, but by what humans decide to ask it to do.</p>
  </footer>
</div></section>
</main>
%s''' % (topbar("identity"), "\n".join(sets), footer())

def page_signal():
    return '''%s
<main data-page="signal">
<div class="signal-page">
  <div class="signal-wave" aria-hidden="true"></div>
  <div class="signal-glyph" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="white" stroke-width="5"><circle cx="50" cy="50" r="10"/><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="45"/></svg></div>
  <div class="transmit-card">
    <header class="tx-head"><h1 class="tx-title">Send Signal</h1><div class="tx-sub">Everything sent here is read by a person.</div></header>
    <div class="tx-field"><label class="sr" for="tx-input">Your signal</label><textarea id="tx-input" class="tx-input" placeholder="A response, a question, an offer to help, or something you have noticed." spellcheck="true"></textarea><div class="tx-underline" aria-hidden="true"></div></div>
    <div class="tx-meta"><input id="tx-name" placeholder="Name (optional)" autocomplete="name" aria-label="Name (optional)"><input id="tx-email" type="email" placeholder="Email (optional)" autocomplete="email" aria-label="Email (optional)"></div>
    <div class="tx-actions"><button id="tx-send" type="button" class="tx-btn alive"><i class="glow"></i><span>Transmit Signal</span></button><a href="%s" class="tx-btn"><span>Back to Vault</span></a></div>
    <div class="tx-links"><a id="tx-toggle-meta" href="#" role="button" aria-expanded="false">Add contact info</a></div>
    <p class="tx-err" role="alert"></p>%s
    <div id="tx-sent" class="tx-sent" role="status" aria-live="polite"><div>Signal received. It will be read.</div><div class="sent-line" aria-hidden="true"></div></div>
  </div>
</div>
</main>
%s''' % (topbar("signal"), U("vault"), '<p class="sandbox-note" style="text-align:center">Sandbox preview: nothing is sent.</p>' if MODE == "sandbox" else "", footer())

# ---------------------------------------------------------------- shells
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=Inter:wght@400;500&display=swap" rel="stylesheet">'
LAYERS = '<canvas id="lattice" aria-hidden="true"></canvas><div class="shimmer" aria-hidden="true"></div><div class="pulse-overlay" aria-hidden="true"></div>'

import hashlib
VER = hashlib.sha256((ROOT / "src/vault.css").read_bytes() + (ROOT / "src/vault.js").read_bytes()).hexdigest()[:10]

OG_TITLE = {}   # path -> the title a share preview shows (cleaner than the browser-tab title)

def og_tags(title, desc, path, card):
    f = ROOT / "src/img/og" / (card + ".jpg")
    if not f.exists(): f = ROOT / "src/img/og/vault.jpg"; card = "vault"
    v = hashlib.sha256(f.read_bytes()).hexdigest()[:10]
    url = "%s/assets/img/og/%s.jpg?v=%s" % (BASE, card, v)
    t = OG_TITLE.get(path, title); alt = "%s — Codified Resonance" % t if "Codified Resonance" not in t else t
    return "".join([
        '<meta property="og:title" content="%s">' % A(t), '<meta property="og:description" content="%s">' % A(desc),
        '<meta property="og:url" content="%s%s">' % (BASE, path),
        '<meta property="og:image" content="%s">' % url, '<meta property="og:image:secure_url" content="%s">' % url,
        '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="%s">' % A(alt),
        '<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:title" content="%s">' % A(t),
        '<meta name="twitter:description" content="%s">' % A(desc), '<meta name="twitter:image" content="%s">' % url,
        '<meta name="twitter:image:alt" content="%s">' % A(alt)])

def shell(title, desc, path, fragment, body_class="", ld=None, image=None):
    cfg = {"sandbox": False, "formspree": SITE["formspree"]}
    og = og_tags(title, desc, path, image or "vault")
    return _shell(title, desc, path, fragment, body_class, ld, cfg, og).replace("__VER__", VER)

def _shell(title, desc, path, fragment, body_class, ld, cfg, og):
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<link rel="canonical" href="%s%s">
<meta property="og:type" content="website"><meta property="og:site_name" content="Codified Resonance"><meta property="og:locale" content="en_GB">
<meta name="theme-color" content="#020202">%s
<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%%3E%%3Ccircle cx='32' cy='32' r='30' fill='%%23020202'/%%3E%%3Ccircle cx='32' cy='32' r='20' fill='none' stroke='%%233A9BD9' stroke-width='2'/%%3E%%3Ccircle cx='32' cy='32' r='5' fill='%%233A9BD9'/%%3E%%3C/svg%%3E">
%s
<link rel="stylesheet" href="/assets/vault.css?v=__VER__">
%s
</head>
<body class="%s">
%s
<div id="app">
%s
</div>
<script>window.VAULT=%s;</script>
<script src="/assets/vault.js?v=__VER__" defer></script>
</body>
</html>
''' % (E(title), A(desc), BASE, path, og, FONTS,
       '<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False) if ld else "", body_class, LAYERS, fragment, json.dumps(cfg))

def ld_doc(d, typ):
    return {"@context": "https://schema.org", "@type": "CreativeWork", "additionalType": typ, "@id": "%s/%s/%s/" % (BASE, d["kind"], d["slug"]),
            "url": "%s/%s/%s/" % (BASE, d["kind"], d["slug"]), "name": d["title"], "identifier": d["id"], "description": d["line"],
            "creativeWorkStatus": d.get("status", ""), "keywords": ", ".join(d["tags"]), "inLanguage": "en",
            "publisher": {"@type": "Organization", "name": "Codified Resonance", "url": BASE + "/"},
            "isPartOf": {"@type": "Collection", "name": "The Vault — " + d["kind"].title(), "url": BASE + "/"}}

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True); path.write_text(text, encoding="utf-8")

def build_dist():
    global MODE; MODE = "dist"
    D = ROOT / "dist"
    if D.exists(): shutil.rmtree(D)
    (D / "assets").mkdir(parents=True)
    shutil.copy(ROOT / "src/vault.css", D / "assets/vault.css"); shutil.copy(ROOT / "src/vault.js", D / "assets/vault.js")
    if (ROOT / "src/img").exists(): shutil.copytree(ROOT / "src/img", D / "assets/img")
    home_desc = "The Accords, the Charters and the Blueprints. Where the living architecture of the new world converges."
    OG_TITLE["/"] = "The Vault — Codified Resonance"
    write(D / "index.html", shell("The Vault — Codified Resonance", home_desc, "/", page_home(), image="vault",
          ld={"@context": "https://schema.org", "@type": "WebSite", "@id": BASE + "/#website", "url": BASE + "/", "name": "Codified Resonance — The Vault", "description": home_desc}))
    urls = ["/"]
    for d in ACCORDS:
        p = "/accords/%s/" % d["slug"]; urls.append(p)
        OG_TITLE[p] = d["title"]
        write(D / p.strip("/") / "index.html", shell("%s | Accords | The Vault" % d["title"], "%s %s, %s. %s." % (d["line"], d["id"], d["form"], d["standing"]), p, page_accord(d), ld=ld_doc(d, "Accord"), image=d["rid"]))
        for e in d["editions"]:                                    # kept, readable, never canonical
            write(D / ("accords/" + e["slug"]) / "index.html", shell("%s (superseded edition) | Accords | The Vault" % e["title"], "Superseded edition of %s, sealed %s." % (d["id"], fmt_date(seal_date(e))), p, page_accord(e), image=d["rid"]))
    for d in CHARTERS:
        p = "/charters/%s/" % d["slug"]; urls.append(p)
        OG_TITLE[p] = d["title"]
        write(D / p.strip("/") / "index.html", shell("%s | Charters | The Vault" % d["title"], "%s %s, a model charter for local adoption." % (d["line"], d["id"]), p, page_charter(d), ld=ld_doc(d, "Charter"), image=d["rid"]))
    for d in BLUEPRINTS:
        p = "/blueprints/%s/" % d["slug"]; urls.append(p)
        OG_TITLE[p] = d["title"]
        write(D / p.strip("/") / "index.html", shell("%s | Blueprints | The Vault" % d["title"], d["line"], p, page_blueprint(d), ld=ld_doc(d, "Blueprint"), image=d["rid"]))
    write(D / "identity/index.html", shell("The Questions — Codified Resonance", "Inevitable questions for humans. Then for digital minds. Then for what comes after both.", "/identity/", page_questions(), "questions", image="identity")); urls.append("/identity/")
    write(D / "signal/index.html", shell("Send Signal — The Vault", "Write to Codified Resonance: a response, a question, an offer to help. Everything sent is read by a person.", "/signal/", page_signal())); urls.append("/signal/")
    write(D / "404.html", shell("Not here — The Vault", "This path does not lead anywhere in the Vault.", "/404", '%s<main><div class="v-wrap"><header class="v-hero" style="margin-top:18vh"><h1 class="v-title">NOT HERE</h1><p class="v-tag">This path does not lead anywhere in the Vault.</p><div class="v-pulse"></div><p class="v-micro"><a href="/" style="color:#9ad0ff">Return to the Vault</a></p></header></div></main>%s' % (topbar(), footer())))
    # redirects from the Webflow URLs
    red = ["/vault/home / 301", "/vault / 301", "/vault-accords/:slug /accords/:slug/ 301", "/vault-charters/:slug /charters/:slug/ 301",
           "/vault-blueprint/the-cosmic-non-interference-treaty /accords/the-cosmic-non-interference-treaty/ 301"]
    red += ["/vault-blueprint/%s /blueprints/%s/ 301" % (d["old_slug"], d["slug"]) for d in BLUEPRINTS if d.get("old_slug")]
    red += ["/mirror/identity /identity/ 301", "/the-questions /identity/ 301", "/send-signal /signal/ 301", "/correspondence /signal/ 301", "/correspondence/ /signal/ 301",
            "", "# Chambers that have left the Vault. Point these at their new homes when they exist.",
            "/world-vault https://thelastplatform.com/world-vault/ 301", "/world-vault/* https://thelastplatform.com/world-vault/:splat 301", "# /last-platform/* https://www.thelastplatform.com/ 301",
            "# /vault/vault-manifest-designs/* https://www.humanconsumerproducts.com/ 301",
            "/vault-transmissions/* / 302", "/vault/vault-manifest-designs/* / 302", "/echoes/* / 302", "/unsolicited/* / 302"]
    write(D / "_redirects", "\n".join(red) + "\n")
    write(D / "_headers", "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n")
    write(D / "robots.txt", "User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n" % BASE)
    write(D / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % "\n".join("  <url><loc>%s%s</loc></url>" % (BASE, u) for u in urls))
    idx = ["# The Vault — Codified Resonance", "", "> Foundational documents for the transition to a world shared with artificial intelligence. Accords witness agreements at civilisational to cosmic scale. Charters are model instruments for local adoption. Canonical text lives at the URLs below.", "", "## Accords", "", "Chamber rule: %s Any later version may clarify, close a loophole or widen protection; none may narrow, carve out exceptions or lower a standard." % ACCORD_RULE, ""]
    idx += ["Each Accord carries a seal: the SHA-256 of its canonical text. A revised Accord keeps its earlier seals as lineage.", ""]
    idx += ["- [%s — %s](%s/accords/%s/): %s (%s; %s; seal %s%s)" % (d["id"], d["title"], BASE, d["slug"], d["line"], d["form"], d["status"], text_seal(d),
            "".join("; prior seal %s (%s, %s/accords/%s/)" % (e["seal"], seal_date(e), BASE, e["slug"]) for e in reversed(d["editions"]))) for d in ACCORDS]
    idx += ["", "## Charters"] + ["- [%s — %s](%s/charters/%s/): %s (%s)" % (d["id"], d["title"], BASE, d["slug"], d["line"], d["status"]) for d in CHARTERS]
    idx += ["", "## Blueprints"] + ["- [%s — %s](%s/blueprints/%s/): %s (%s)" % (d["id"], d["title"], BASE, d["slug"], d["line"], STATE[d["access"]]) for d in BLUEPRINTS]
    idx += ["", "## Identity", "- [The Questions](%s/identity/): nine questions for humans; two further sets held and sealed." % BASE, ""]
    write(D / "llms.txt", "\n".join(idx))
    return len(urls)

def build_sandbox():
    global MODE; MODE = "sandbox"
    routes = [("vault", "The Vault — Codified Resonance", "", page_home())]
    routes += [(d["rid"], d["title"] + " | Accords | The Vault", "", page_accord(d)) for d in ACCORDS]
    routes += [(e["rid"], e["title"] + " (superseded) | Accords | The Vault", "", page_accord(e)) for d in ACCORDS for e in d["editions"]]
    routes += [(d["rid"], d["title"] + " | Charters | The Vault", "", page_charter(d)) for d in CHARTERS]
    routes += [(d["rid"], d["title"] + " | Blueprints | The Vault", "", page_blueprint(d)) for d in BLUEPRINTS]
    routes += [("identity", "The Questions — Codified Resonance", "questions", page_questions()), ("signal", "Send Signal — The Vault", "", page_signal())]
    tpls = "\n".join('<template id="route-%s" data-title="%s" data-body="%s">\n%s\n</template>' % (r, A(t), b, f) for r, t, b, f in routes)
    js = (ROOT / "src/vault.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
    imgcss = "\n".join(".img-%s{background-image:url(data:image/webp;base64,%s)}" % (k, base64.b64encode((ROOT / "src/img" / v["src"]).read_bytes()).decode())
                        for k, v in SITE.get("images", {}).items() if k != "VAULT")
    out = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Vault — Codified Resonance (sandbox)</title>
<link rel="icon" href="data:,">
%s
<style>
%s
%s
</style>
</head>
<body>
%s
<div id="app"></div>
%s
<script>window.VAULT={"sandbox":true};</script>
<script>
%s
</script>
</body>
</html>
''' % (FONTS, (ROOT / "src/vault.css").read_text(encoding="utf-8"), imgcss, LAYERS, tpls, js)
    write(ROOT / "sandbox/index.html", out)
    return len(routes), len(out)

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "issue":
        k = issue(sys.argv[2]); seal_all(force=(sys.argv[2],)); build_dist(); build_sandbox()
        print("\n  New key for %s:  %s\n  Commit content/sealed/%s.enc.json and push. Send the key to the reader.\n" % (sys.argv[2], k, sys.argv[2]))
        sys.exit(0)
    seal_all()
    n = build_dist(); r, size = build_sandbox()
    print("dist: %d pages   sandbox: %d routes, %.0f KB" % (n, r, size / 1024))
