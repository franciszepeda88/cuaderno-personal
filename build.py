#!/usr/bin/env python3
"""
Generador estático del cuaderno personal.

Uso:
    python3 build.py            # genera el sitio en dist/
    python3 build.py --serve    # genera y levanta un servidor local en :8000

No requiere Node ni npm. Dependencias: jinja2, pyyaml, markdown
(instalar con:  pip install -r requirements.txt)
"""
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
ADMIN = ROOT / "admin"
DIST = ROOT / "dist"

MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]
MESES_ABR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?\n)---\s*\n(.*)$", re.DOTALL)


def slugify(text):
    text = text.lower().strip()
    text = (
        text.replace("á", "a").replace("é", "e").replace("í", "i")
        .replace("ó", "o").replace("ú", "u").replace("ñ", "n").replace("ü", "u")
    )
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def parse_post(path):
    raw = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        raise ValueError(f"{path.name}: falta el bloque de frontmatter (---) al inicio del archivo")
    meta = yaml.safe_load(m.group(1)) or {}
    body_md = m.group(2).strip()

    for field in ("title", "date", "category"):
        if field not in meta:
            raise ValueError(f"{path.name}: falta el campo obligatorio '{field}' en el frontmatter")

    post_date = meta["date"]
    if isinstance(post_date, str):
        post_date = date.fromisoformat(post_date)

    md = markdown.Markdown(extensions=["extra", "toc"])
    body_html = md.convert(body_md)
    body_html = body_html.replace("<p>", '<p class="drop">', 1)  # drop-cap on first paragraph
    toc = [{"text": t["name"], "id": t["id"]} for t in md.toc_tokens if t["level"] == 2]

    first_block = body_md.split("\n\n", 1)[0]
    excerpt = re.sub(r"[#*_`]", "", first_block).strip()

    if meta.get("slug"):
        slug = slugify(meta["slug"])
    elif re.match(r"^\d{4}-\d{2}-\d{2}-", path.stem):
        slug = slugify(path.stem[11:])  # strip the leading "YYYY-MM-DD-"
    else:
        slug = slugify(path.stem)
    if not slug:
        slug = slugify(meta["title"])

    return {
        "title": meta["title"],
        "date": post_date,
        "date_display": f"{post_date.day} de {MESES[post_date.month - 1]} de {post_date.year}",
        "date_short": f"{post_date.day:02d} {MESES_ABR[post_date.month - 1]} {post_date.year}",
        "date_iso": post_date.isoformat(),
        "category": meta["category"],
        "dek": meta.get("dek", ""),
        "meta_description": meta.get("meta_description", "") or meta.get("dek", ""),
        "read_time": meta.get("read_time", ""),
        "excerpt": excerpt,
        "body_html": body_html,
        "toc": toc,
        "slug": slug,
        "url": f"posts/{slug}/index.html",
        "source": path.name,
    }


def load_posts():
    posts_dir = CONTENT / "posts"
    posts = []
    for path in sorted(posts_dir.glob("*.md")):
        try:
            posts.append(parse_post(path))
        except ValueError as e:
            print(f"⚠️  Saltando {path.name}: {e}", file=sys.stderr)
    posts.sort(key=lambda p: p["date"], reverse=True)

    total = len(posts)
    for i, post in enumerate(posts):
        post["number"] = f"{total - i:03d}"
    return posts


def parse_fragment(path):
    raw = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        raise ValueError(f"{path.name}: falta el bloque de frontmatter (---) al inicio del archivo")
    meta = yaml.safe_load(m.group(1)) or {}

    if "image" not in meta:
        raise ValueError(f"{path.name}: falta el campo obligatorio 'image'")

    frag_date = meta.get("date", date.today())
    if isinstance(frag_date, str):
        frag_date = date.fromisoformat(frag_date)

    return {
        "date": frag_date,
        "image": meta["image"],
        "caption": meta.get("caption", ""),
        "link": meta.get("link", ""),
    }


def load_fragments():
    frag_dir = CONTENT / "fragments"
    if not frag_dir.exists():
        return []
    fragments = []
    for path in sorted(frag_dir.glob("*.md")):
        try:
            fragments.append(parse_fragment(path))
        except ValueError as e:
            print(f"⚠️  Saltando {path.name}: {e}", file=sys.stderr)
    fragments.sort(key=lambda f: f["date"], reverse=True)
    return fragments


# ============ Imágenes para compartir (Open Graph) ============
OG_SIZE = (1200, 630)


def _wrap_text(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def make_og_image(out_path, title, kicker, site):
    w, h = OG_SIZE
    hero_path = None
    if site.get("hero_image"):
        candidate = STATIC / site["hero_image"].lstrip("/")
        if candidate.exists():
            hero_path = candidate

    if hero_path:
        bg = Image.open(hero_path).convert("RGB")
        src_ratio, dst_ratio = bg.width / bg.height, w / h
        if src_ratio > dst_ratio:
            new_h = h
            new_w = int(h * src_ratio)
        else:
            new_w = w
            new_h = int(w / src_ratio)
        bg = bg.resize((new_w, new_h), Image.LANCZOS)
        bg = bg.crop(((new_w - w) // 2, (new_h - h) // 2, (new_w - w) // 2 + w, (new_h - h) // 2 + h))
    else:
        bg = Image.new("RGB", (w, h), (8, 22, 56))  # --accent-deep

    veil = Image.new("L", (1, h), color=0)
    for y in range(h):
        t = y / h
        veil.putpixel((0, y), int(40 + t * 175))
    veil = veil.resize((w, h))
    black = Image.new("RGB", (w, h), (5, 8, 19))
    bg = Image.composite(black, bg, veil)

    draw = ImageDraw.Draw(bg)
    archivo_bold = ImageFont.truetype(str(STATIC / "fonts/archivo-700.ttf"), 30)
    newsreader_bold = ImageFont.truetype(str(STATIC / "fonts/newsreader-600.ttf"), 64)
    archivo_med = ImageFont.truetype(str(STATIC / "fonts/archivo-500.ttf"), 28)

    margin = 80
    draw.text((margin, 90), kicker.upper(), font=archivo_bold, fill=(126, 156, 255))

    lines = _wrap_text(draw, title, newsreader_bold, w - margin * 2)[:4]
    y = 150
    for line in lines:
        draw.text((margin, y), line, font=newsreader_bold, fill=(255, 255, 255))
        y += 76

    draw.text((margin, h - 100), site.get("wordmark", site.get("name", "")), font=archivo_med, fill=(255, 255, 255))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(out_path, "JPEG", quality=87)


def _rfc2822(d):
    # Formato de fecha que exige el estándar RSS 2.0 (no acepta el formato ISO).
    import datetime
    return datetime.datetime(d.year, d.month, d.day).strftime("%a, %d %b %Y 00:00:00 +0000")


def _xml_escape(text):
    return (
        text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace('"', "&quot;").replace("'", "&apos;")
    )


def generate_rss(site, posts):
    site_url = site.get("site_url", "").rstrip("/")
    items = []
    for post in posts[:20]:
        items.append(f"""    <item>
      <title>{_xml_escape(post['title'])}</title>
      <link>{post['canonical_url']}</link>
      <guid isPermaLink="true">{post['canonical_url']}</guid>
      <pubDate>{_rfc2822(post['date'])}</pubDate>
      <description>{_xml_escape(post['meta_description'])}</description>
      <category>{_xml_escape(post['category'])}</category>
    </item>""")
    body = "\n".join(items)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{_xml_escape(site.get('name', ''))}</title>
    <link>{site_url}/</link>
    <description>{_xml_escape(site.get('tagline', ''))}</description>
    <language>es</language>
{body}
  </channel>
</rss>
"""


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    site = yaml.safe_load((CONTENT / "site.yml").read_text(encoding="utf-8"))
    posts = load_posts()
    fragments = load_fragments()

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=False, trim_blocks=True, lstrip_blocks=True)

    # ---- imágenes para compartir (Open Graph) ----
    make_og_image(DIST / "og" / "site.jpg", site.get("hero_title", site.get("name", "")), site.get("hero_kicker", ""), site)
    site_url = site.get("site_url", "").rstrip("/")
    for post in posts:
        make_og_image(DIST / "og" / f"{post['slug']}.jpg", post["title"], post["category"], site)
        post["og_image"] = f"og/{post['slug']}.jpg"
        post["canonical_url"] = f"{site_url}/{post['url'].replace('index.html', '')}"
        post["jsonld"] = json.dumps({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post["title"],
            "description": post["meta_description"],
            "datePublished": post["date_iso"],
            "dateModified": post["date_iso"],
            "url": post["canonical_url"],
            "image": f"{site_url}/{post['og_image']}",
            "author": {"@type": "Person", "name": site.get("name", "")},
            "publisher": {"@type": "Person", "name": site.get("name", "")},
            "mainEntityOfPage": {"@type": "WebPage", "@id": post["canonical_url"]},
            "articleSection": post["category"],
        }, ensure_ascii=False)

    # ---- index.html ----
    index_tpl = env.get_template("index.html")
    lead = posts[0] if posts else None
    rest = posts[1:9] if len(posts) > 1 else []
    (DIST / "index.html").write_text(
        index_tpl.render(site=site, lead=lead, rest=rest, fragments=fragments[:6], posts_total=len(posts), base_path=""),
        encoding="utf-8",
    )

    # ---- ensayos.html (archivo completo) ----
    categories = sorted({p["category"] for p in posts})
    ensayos_tpl = env.get_template("ensayos.html")
    (DIST / "ensayos").mkdir(parents=True, exist_ok=True)
    (DIST / "ensayos" / "index.html").write_text(
        ensayos_tpl.render(site=site, posts=posts, categories=categories, base_path="../"),
        encoding="utf-8",
    )

    # ---- post pages ----
    post_tpl = env.get_template("post.html")
    for i, post in enumerate(posts):
        prev_post = posts[i + 1] if i + 1 < len(posts) else None  # older
        next_post = posts[i - 1] if i - 1 >= 0 else None          # newer
        out_dir = DIST / "posts" / post["slug"]
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(
            post_tpl.render(site=site, post=post, prev_post=prev_post, next_post=next_post, base_path="../../"),
            encoding="utf-8",
        )

    # ---- RSS ----
    (DIST / "rss.xml").write_text(generate_rss(site, posts), encoding="utf-8")

    # ---- 404 page ----
    notfound_tpl = env.get_template("404.html")
    (DIST / "404.html").write_text(
        notfound_tpl.render(site=site, base_path=""),
        encoding="utf-8",
    )

    # ---- static assets ----
    shutil.copytree(STATIC / "css", DIST / "css")
    shutil.copytree(STATIC / "js", DIST / "js")
    shutil.copytree(STATIC / "fonts", DIST / "fonts")
    if (STATIC / "img").exists() and any((STATIC / "img").iterdir()):
        shutil.copytree(STATIC / "img", DIST / "img")

    # ---- admin (Decap CMS) ----
    if ADMIN.exists():
        shutil.copytree(ADMIN, DIST / "admin")

    print(f"✅ Sitio generado en {DIST}  ({len(posts)} ensayos, {len(fragments)} fragmentos)")


if __name__ == "__main__":
    build()
    if "--serve" in sys.argv:
        import http.server
        import socketserver

        PORT = 8000
        handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=str(DIST), **kw)
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"👀 Vista previa en http://localhost:{PORT}")
            httpd.serve_forever()
