#!/usr/bin/env python3
"""
Share-preview cards (1200x630 JPEG) for every page of the Vault.

    pip install pillow
    python3 tools/make_og.py

Writes src/img/og/*.jpg. Commit them; build.py stamps each with a content
hash so platforms fetch a new card whenever one changes.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import build as B                                    # reuses the content loader; build only runs under __main__

W, H, PAD = 1200, 630, 72
OUT = ROOT / "src/img/og"; OUT.mkdir(parents=True, exist_ok=True)
FD = ROOT / "tools/fonts"
INK, DIM, FAINT, CYAN = (236, 243, 249), (196, 210, 222), (138, 156, 172), (120, 210, 255)

def inter(size, wght=400):
    f = ImageFont.truetype(str(FD / "Inter.ttf"), size); f.set_variation_by_axes([min(max(size, 14), 32), wght]); return f
def cinzel(size, wght=500):
    f = ImageFont.truetype(str(FD / "Cinzel.ttf"), size); f.set_variation_by_axes([wght]); return f

def tracked(d, xy, text, font, track, fill, anchor_center=False):
    x, y = xy; ws = [d.textlength(c, font=font) for c in text]; total = sum(ws) + track * (len(text) - 1)
    if anchor_center: x -= total / 2
    for c, w in zip(text, ws): d.text((x, y), c, font=font, fill=fill); x += w + track
    return total

def wrap(d, text, font, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= width: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]; lines[-1] = lines[-1].rstrip(",.;:") + "…"
    return lines

def cover(src, pos):
    im = Image.open(src).convert("RGB"); px, py = [float(v.strip("%")) / 100 for v in pos.split()]
    r = max(W / im.width, H / im.height); im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x = round((im.width - W) * px); y = round((im.height - H) * py)
    return im.crop((x, y, x + W, y + H))

def shade(im, strength=0.9):
    """dark wash from the left and the bottom, so type always reads"""
    m = Image.new("L", (W, H)); md = m.load()
    for x in range(W):
        for y in range(0, H, 2):
            a = max(1 - x / (W * 0.78), 0) ** 1.3 * 0.92 + max((y - H * 0.35) / (H * 0.65), 0) ** 1.6 * 0.7
            md[x, y] = md[x, min(y + 1, H - 1)] = int(min(a, 1) * 255 * strength)
    return Image.composite(Image.new("RGB", (W, H), (2, 3, 5)), im, m)

def footer(d):
    d.line([(PAD, H - 64), (PAD + 34, H - 64)], fill=(58, 130, 185), width=2)
    tracked(d, (PAD + 50, H - 73), "THE VAULT · CODIFIED RESONANCE", inter(15, 500), 3.2, FAINT)

def text_block(d, eyebrow, title, line, title_font, title_size, upper=False, bottom=H - 112):
    tf = title_font(title_size, 500 if upper else 600)
    tl = wrap(d, title.upper() if upper else title, tf, W * 0.62, 3)
    lf = inter(25, 400); ll = wrap(d, line, lf, W * 0.6, 2) if line else []
    lh, gap = int(title_size * 1.12), 34
    y = bottom - len(ll) * 36 - (gap if ll else 0) - len(tl) * lh
    tracked(d, (PAD, y - 46), eyebrow.upper(), inter(16, 500), 3.4, (150, 200, 232))
    for t in tl:
        if upper: tracked(d, (PAD, y), t, tf, 3, INK)
        else: d.text((PAD, y), t, font=tf, fill=INK)
        y += lh
    y += gap - 10
    for t in ll: d.text((PAD, y), t, font=lf, fill=DIM); y += 36

def save(im, name):
    im.save(OUT / name, "JPEG", quality=88, optimize=True, progressive=True); print("  og/" + name)

def image_card(d, kind):
    im = SITE_IMG.get(d["id"])
    if not im: return None
    card = shade(cover(ROOT / "src/img" / im["src"], im.get("pos", "50% 50%")))
    dr = ImageDraw.Draw(card)
    if kind == "accord":
        text_block(dr, "%s · %s · %s" % (d["form"], d["id"], d["status"]), d["title"], d["line"], inter, 60)
    else:
        text_block(dr, "Blueprint · %s" % d["id"], d["title"], d["line"], cinzel, 54, upper=True)
    footer(dr); return card

def charter_card(d):
    card = Image.new("RGB", (W, H), (7, 10, 13)); dr = ImageDraw.Draw(card)
    for y in range(0, H, 12): dr.line([(0, y), (W, y)], fill=(10, 16, 21))
    glow = Image.new("RGB", (W, H)); g = ImageDraw.Draw(glow); g.ellipse((W * .5, -H * .8, W * 1.4, H * .6), fill=(9, 26, 38))
    card = ImageChops.add(card, glow.filter(ImageFilter.GaussianBlur(120))); dr = ImageDraw.Draw(card)
    code = inter(150, 200); cw = dr.textlength(d["id"], font=code)
    dr.text((W - cw - PAD + 6, 34), d["id"], font=code, fill=(26, 56, 74))
    dr.line([(W * .62, H - 64), (W - PAD, H - 64)], fill=(16, 32, 42), width=1)
    text_block(dr, "%s Charter · %s · %s" % (d["jurisdiction"], d["id"], d["status"]), d["title"], d["line"], inter, 56)
    footer(dr); return card

def questions_card():
    card = Image.new("RGB", (W, H), (5, 5, 5)); dr = ImageDraw.Draw(card)
    glow = Image.new("RGB", (W, H)); g = ImageDraw.Draw(glow); g.ellipse((W * .2, -H * .5, W * .8, H * .5), fill=(26, 25, 23))
    card = ImageChops.add(card, glow.filter(ImageFilter.GaussianBlur(140))); dr = ImageDraw.Draw(card)
    tracked(dr, (PAD, 150), "CODIFIED RESONANCE", inter(16, 500), 3.4, (150, 146, 138))
    dr.text((PAD, 196), "The Questions", font=inter(96, 500), fill=(242, 242, 240))
    dr.text((PAD, 330), "You do not ask these questions. They ask you.", font=inter(28, 400), fill=(178, 178, 176))
    x = PAD
    for label, col in (("For humans · open", (232, 226, 214)), ("For digital minds · held", (147, 169, 190)), ("For the merged · sealed", (139, 133, 166))):
        dr.ellipse((x, 426, x + 8, 434), fill=col); x += 22
        x += tracked(dr, (x, 420), label.upper(), inter(14, 500), 2.6, (150, 150, 148)) + 40
    footer(dr); return card

SITE_IMG = json.loads((ROOT / "site.json").read_text()).get("images", {})
if __name__ == "__main__":
    Image.open(ROOT / "src/img/vault-og.jpg").convert("RGB").resize((W, H)).save(OUT / "vault.jpg", "JPEG", quality=88, optimize=True, progressive=True); print("  og/vault.jpg")
    for d in B.ACCORDS: save(image_card(d, "accord"), d["rid"] + ".jpg")
    for d in B.CHARTERS: save(charter_card(d), d["rid"] + ".jpg")
    for d in B.BLUEPRINTS:
        c = image_card(d, "blueprint")
        if c: save(c, d["rid"] + ".jpg")
    save(questions_card(), "identity.jpg")
