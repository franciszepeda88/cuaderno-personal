# Cuaderno personal — Francis Zepeda

Sitio estático (sin Node, sin frameworks pesados) construido con **Python + Jinja2**.
Escribes ensayos en Markdown (o desde un panel visual en `/admin`) y el sitio se
reconstruye solo cada vez que publicas.

## Estructura

```
content/
  site.yml          ← nombre, bio, temas, redes sociales, textos del hero
  posts/*.md        ← un ensayo = un archivo .md con frontmatter
templates/           ← el diseño (Jinja2 + HTML)
static/               ← CSS, JS, tipografías, imágenes
admin/                ← panel de edición (Decap CMS)
build.py              ← el generador: content + templates → dist/
dist/                  ← el sitio ya construido (se genera solo, no lo edites a mano)
```

## Ver el sitio en tu computadora

```bash
cd "sitio-personal"
./.venv/bin/python3 build.py --serve
```

Abre `http://localhost:8000`. Cada vez que cambies algo, vuelve a correr el comando
(o solo `./.venv/bin/python3 build.py` y recarga el navegador).

## Escribir un ensayo nuevo

**Opción A — a mano:** crea un archivo en `content/posts/`, con el nombre
`AAAA-MM-DD-titulo-corto.md`, con este formato:

```markdown
---
title: "Título del ensayo"
date: 2026-09-01
category: "Filosofía"   # Filosofía | Geopolítica | Empresa | Pensamientos
dek: "Una frase que resuma de qué trata."
read_time: "6 min de lectura"
---
Primer párrafo — este es el que aparece como adelanto en la portada.

## Un subtítulo si quieres dividir el ensayo

Más párrafos, con **negritas**, *cursivas* y [enlaces](https://ejemplo.com) normales.

> Una cita destacada, si la necesitas.
```

Corre `python3 build.py` y listo — aparece en la portada y en el archivo automáticamente,
con su número de ensayo asignado solo (no lo escribas a mano).

**Opción B — desde el panel `/admin`:** una vez desplegado (ver abajo), entra a
`tusitio.netlify.app/admin`, inicia sesión, y verás un formulario: título, fecha,
categoría, entradilla y un editor de texto para el contenido. Al hacer clic en
"Publicar", el sitio se reconstruye solo en 1-2 minutos.

## Publicarlo gratis (GitHub + Netlify)

Esto lo tienes que hacer tú una vez — son cuentas y clics que solo tú puedes
autorizar. Te dejo la ruta exacta:

1. **Crea una cuenta en [github.com](https://github.com)** (gratis) si no tienes una.
2. **Crea un repositorio nuevo**, por ejemplo `cuaderno-personal`, y sube esta carpeta:
   ```bash
   cd "sitio-personal"
   git init
   git add .
   git commit -m "Primer commit del cuaderno"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/cuaderno-personal.git
   git push -u origin main
   ```
3. **Crea una cuenta en [netlify.com](https://netlify.com)** (gratis, puedes entrar con tu cuenta de GitHub).
4. En Netlify: **"Add new site" → "Import an existing project"** → elige GitHub → selecciona tu repositorio.
   Netlify va a detectar el archivo `netlify.toml` solo (build command y carpeta ya están configurados).
5. Dale a **"Deploy"**. En un par de minutos tu sitio queda publicado en una URL gratis
   tipo `https://cuaderno-personal-xyz123.netlify.app` (puedes cambiar ese subdominio
   por uno tuyo, gratis, en *Site settings → Domain management*).
6. **El panel de escritura ya funciona sin pasos extra:** `admin/config.yml` usa el backend
   `github` directo — cuando entres a `tusitio.netlify.app/admin`, dale a "Login with GitHub"
   e inicia sesión con tu propia cuenta (Netlify provee el proxy de autenticación automáticamente
   para cualquier sitio que aloja). La primera vez, GitHub te pedirá autorizar la aplicación
   "Netlify CMS OAuth" — acéptalo, es el mecanismo estándar de Decap CMS.
7. **Si el sitio muestra "401 Unauthorized"** al abrirlo, es que Netlify lo dejó como privado
   por defecto — en el panel del proyecto, dale a **"Make public"**.

Cuando más adelante quieras un dominio propio (tunombre.com), lo compras donde prefieras
y lo conectas gratis desde *Site settings → Domain management → Add a domain* — Netlify
te da instrucciones exactas para ese dominio.

## Editar el resto del contenido (bio, redes, temas, textos del hero)

Todo eso vive en `content/site.yml` — o desde `/admin → Ajustes del sitio` una vez desplegado.
No necesitas tocar el HTML para cambiar tu biografía, tus redes sociales o el título del hero.

## Paleta y tipografía

- Colores: definidos como variables en `static/css/style.css` (`:root`), con azul cobalto
  (`--accent`) y cian (`--accent-2`) como acentos, sobre fondo claro u oscuro automático
  según el tema del sistema — o el botón de la esquina superior derecha.
- Tipografías: Newsreader (serif, para títulos y cuerpo) + Archivo (para navegación y
  etiquetas), incluidas como archivos en `static/fonts/` — no dependen de internet.
