---
name: web-assets
description: One entry point for website assets. Use when a project needs icons (finding the exact SVG from 200+ open icon sets like Lucide, Tabler, Phosphor, Material), favicons, PWA/app icons, Apple touch icons, or Open Graph / Twitter / social share images with matching meta tags. Bundles better-icons and web-asset-generator and routes to the right one.
---

# Web Assets (router)

This skill holds asset skills in `skills/` next to this file. Read the matching sub-skill's `skills/<name>/SKILL.md` in full and follow it. Relative paths inside it (`scripts/…`, `references/…`) mean that sub-skill's own folder. Say in one line which one you're using.

| Sub-skill | Best for | Needs |
|---|---|---|
| `better-icons` | Search Iconify's 200+ icon libraries and drop the exact SVG into the project (`better-icons search arrow`, `better-icons get lucide:home`). Use instead of emoji or hand-drawn icons. | Node; fetches the `better-icons` npm CLI via `npx` on first use. |
| `web-asset-generator` | Favicons (ico + png sizes), PWA manifest icons, Apple touch icons, OG/Twitter/LinkedIn share images from a logo, emoji or text, plus the HTML `<meta>`/`<link>` tags. | Python 3 with Pillow (`pip install Pillow`); its `check_dependencies.py` verifies. |

## Related elsewhere
- Brand look, logos' shape language, design tokens: `ui-design` (`brand-visual-language`, `extract-design`).
- Checking that meta tags, OG tags and favicons are correct on a page: `site-quality` (`fixing-metadata`).
- Posters and static art: the built-in `canvas-design` skill.

## Typical flow for a new site
1. Pick an icon set that matches the design and get every icon via `better-icons` (one set per product).
2. Generate favicons + OG image with `web-asset-generator` from the logo.
3. Run `site-quality` → `fixing-metadata` to confirm the tags are wired up.
