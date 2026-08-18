#!/usr/bin/env python3
"""
Generador estático del cuaderno personal.

Uso:
    python3 build.py            # genera el sitio en dist/
    python3 build.py --serve    # genera y levanta un servidor local en :8000

No requiere Node ni npm. Dependencias: jinja2, pyyaml, markdown
(instalar con:  pip install -r requirements.txt)
"""
import re
import shutil
import sys
from datetime import date
from pathlib import Path

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader

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

    body_html = markdown.markdown(body_md, extensions=["extra"])
    body_html = body_html.replace("<p>", '<p class="drop">', 1)  # drop-cap on first paragraph

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
        "category": meta["category"],
        "dek": meta.get("dek", ""),
        "read_time": meta.get("read_time", ""),
        "excerpt": excerpt,
        "body_html": body_html,
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


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    site = yaml.safe_load((CONTENT / "site.yml").read_text(encoding="utf-8"))
    posts = load_posts()

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=False, trim_blocks=True, lstrip_blocks=True)

    # ---- index.html ----
    index_tpl = env.get_template("index.html")
    lead = posts[0] if posts else None
    rest = posts[1:9] if len(posts) > 1 else []
    (DIST / "index.html").write_text(
        index_tpl.render(site=site, lead=lead, rest=rest, base_path=""),
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

    print(f"✅ Sitio generado en {DIST}  ({len(posts)} ensayos)")


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
