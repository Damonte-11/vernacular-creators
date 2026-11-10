---
name: site-quality
description: One entry point for checking and fixing a website's quality before or after shipping. Use when asked to audit a site, run a Lighthouse-style review, speed up a page, fix Core Web Vitals (LCP, INP, CLS), improve SEO, fix meta/Open Graph tags, structured data or canonical URLs, check or fix accessibility (WCAG 2.1/2.2, ARIA, keyboard, contrast, screen readers), or apply security and modern best practices. Bundles 9 skills (Addy Osmani's web quality skills, ibelick fixers, accessibility review) and routes to the right ones.
---

# Site Quality (router)

This skill holds 9 audit-and-fix skills in `skills/` next to this file. Pick the right one(s), read `skills/<name>/SKILL.md` in full, and follow it. Relative paths inside a sub-skill (`scripts/…`, `references/…`) mean that sub-skill's own folder. Say in one line which sub-skill(s) you're using.

## Pick by task
| Sub-skill | Best for |
|---|---|
| `web-quality-audit` | Full evidence-led audit across performance, accessibility, SEO and best practices. **Start here** when the request is broad ("audit my site", "is this ready to ship?"). |
| `performance` | Slow loading: bundle size, images, fonts, caching, render-blocking resources. |
| `core-web-vitals` | Specific LCP, INP or CLS problems, using field and lab evidence. |
| `seo` | Search visibility: titles, headings, sitemaps, structured data, crawlability. |
| `fixing-metadata` | Quick fix pass on `<title>`, meta description, canonical, OG/Twitter cards, favicons, JSON-LD, robots. |
| `accessibility` | Thorough WCAG 2.2 audit and improvements. |
| `fixing-accessibility` | Quick fix pass while building: ARIA labels, focus, keyboard, contrast, form errors, dialogs. |
| `accessibility-review` | WCAG 2.1 AA review of a design or page before handoff (contrast, touch targets, screen reader behavior). |
| `best-practices` | Security headers, HTTPS, deprecated APIs, console errors, modern code quality. |

## How to combine
- Broad audit: `web-quality-audit` first, then open only the specific skills for the areas it flags.
- While building a page: `fixing-accessibility` + `fixing-metadata` as a final pass.
- Janky animation is a motion problem: use the `animation` skill (`animation-performance`).
- Report findings ordered by impact, separate what you verified (measured, ran, looked at) from what you inferred, and fix only what the user asked for.
