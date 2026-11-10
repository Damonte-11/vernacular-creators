---
name: ui-design
description: One entry point for all UI and visual design work. Use when designing, building, redesigning, restyling, polishing, critiquing or reviewing any interface (landing pages, company/product sites, SaaS, dashboards, app screens, components, mobile web, slide decks) or when choosing a visual direction, design system, DESIGN.md, brand look, typography, color, layout, UI copy or UI library, or when a page looks generic or "AI-made". Bundles 22 design skills (Taste Skill, Impeccable, UI UX Pro Max, Emil Kowalski, ibelick UI skills, Dembrandt, the DESIGN.md library and more) and routes to the right ones.
---

# UI Design (router)

This skill holds 22 design skills in `skills/` next to this file. Pick the right one(s) for the task, read them, and follow them. For motion use the `animation` skill; for icons/favicons/OG images use `web-assets`; for performance/SEO/accessibility audits use `site-quality`.

## How to use

1. Match the task to 1–3 sub-skills from the table below. Prefer one lead skill plus at most two helpers. Never load all of them.
2. Read `skills/<name>/SKILL.md` in full (path relative to this file's folder). Say in one line which sub-skill(s) you're using.
3. Inside a sub-skill, `<skill>`, `<skill-base-dir>`, `${CLAUDE_SKILL_DIR}` and relative paths (`references/…`, `scripts/…`) all mean **that sub-skill's own folder**, e.g. `~/.claude/skills/ui-design/skills/design-taste-frontend/`. Load its reference files only when its instructions call for them.
4. When a sub-skill says "use <other-skill>", find that name in this table, or in the `animation`, `web-assets` or `site-quality` skills.
5. On conflicts: the user and the project's own rules win, then the lead sub-skill, then helpers.

## Pick by task

**Build a new page or site (pick ONE lead engine):**
| Sub-skill | Best for |
|---|---|
| `design-taste-frontend` | Marketing/company/product landing pages that must look art-directed: real photos, hero moments, strict browser-checked finish gate. Needs Node + Chrome/Edge. Its finish gate does not run automatically here: run `node <skill>/scripts/gate.mjs` as its instructions say. |
| `impeccable` | Any frontend (sites, dashboards, app UI, native screens) with 24 sub-commands: `shape`, `critique`, `audit`, `polish`, `bolder`, `quieter`, `typeset`, `colorize`, `layout`, `harden`, `onboard`, `live`, `document`… Best for iterating on an existing UI. |
| `ui-ux-pro-max` | Fast, data-driven picks: searchable styles, palettes, font pairings, UX rules and per-stack guidance (React, Next, Vue, Svelte, Flutter, SwiftUI…). Good for choosing a design system or checking a specific UX rule. |
| `frontend-design` | Lightweight aesthetic direction for a small UI when the heavy engines are overkill. |

**Direction, systems and brand:**
| Sub-skill | Best for |
|---|---|
| `design-md-library` | 84 ready DESIGN.md files inspired by real brands ("make it look like Linear/Stripe/Vercel"). |
| `create-design-md` | Write a DESIGN.md from an existing repo or public site. |
| `extract-design` | Pull real tokens (colors, type, spacing) from a live URL with the Dembrandt CLI. |
| `brand-visual-language` | Shape language: radius, icon style and type that carry a brand's personality. |
| `design-system` | Audit, document or extend a design system (naming, hardcoded values, component docs). |
| `emil-design-eng` | Emil Kowalski's polish philosophy: component feel, invisible details. |
| `apple-design` | Apple-style fluid, physical UI: materials, depth, springs, type. |

**Review, polish and fix an existing UI:**
| Sub-skill | Best for |
|---|---|
| `baseline-ui` | Fast "de-slop" pass: spacing, hierarchy, typography, small layout fixes. |
| `improve-ui` | Read-only audit that writes implementation plans for another agent. |
| `design-critique` | Structured feedback on usability, hierarchy and consistency. |
| `break-ui` | Stress-test a component with worst-case data (long names, empty, huge counts, RTL, emoji). |
| `mobile-native` | Make a web app feel native on phones (100vh, tap highlight, safe areas, zooming inputs). |

**Specific jobs:**
| Sub-skill | Best for |
|---|---|
| `ux-copy` | Microcopy, CTAs, errors, empty states. |
| `design-handoff` | Developer spec sheet from a finished design. |
| `frontend-slides` | Animated single-file HTML presentations, or convert a PPTX to web. |
| `ask-sonner` | Sonner toast library setup and troubleshooting. |
| `pick-ui-library` | Pick a library for a frontend job (charts, OTP, command menu…). Only when the user asks. |
| `prototype` | Build several distinct variants behind a live picker. Only when the user asks. |

## Good combinations
- New landing page: `design-taste-frontend` (lead) + `design-md-library` if a reference brand is named.
- Redesign an existing app: `impeccable` (lead) + `ui-ux-pro-max` for stack-specific rules.
- Quick cleanup: `baseline-ui`, then `site-quality` → `fixing-accessibility`.
- Match a competitor's look: `extract-design` → `create-design-md` → build with a lead engine.
