---
name: animation
description: One entry point for all motion and animation work on the web and in React Native. Use when adding, building, choreographing, reviewing, auditing, removing or fixing animations, transitions, hover/press states, micro-interactions, gestures (drag, swipe, sheets), scroll effects (reveal, parallax, pinning, ScrollTrigger, storytelling), page/hero entrances, Three.js/3D scenes, or janky/stuttering motion. Covers GSAP (official skills), Motion/Framer Motion (official), CSS, Expo/Reanimated and Three.js. Bundles 24 animation skills (Emil Kowalski, GreenSock, Motion, Meng To and more) and routes to the right ones.
---

# Animation (router)

This skill holds 24 motion skills in `skills/` next to this file. Pick the right one(s), read them, and follow them. For general UI design use `ui-design`; for page-speed audits use `site-quality`.

## How to use

1. Match the task to 1–3 sub-skills below: usually one **approach** skill (what motion, why, which curve) plus one **library** skill (how to code it). Never load all of them.
2. Read `skills/<name>/SKILL.md` in full (path relative to this file's folder). Say in one line which sub-skill(s) you're using.
3. Relative paths inside a sub-skill (`references/…`, `scripts/…`) mean that sub-skill's own folder.
4. When a sub-skill says "use <other-skill>", find it in this table, or in `ui-design` / `site-quality`.
5. Pick the library the project already uses. If none: CSS for simple transitions, Motion in React apps, GSAP for timelines and scroll-driven work, Reanimated for Expo.

## Approach: deciding what motion to make
| Sub-skill | Best for |
|---|---|
| `animate` | Build one animation from scratch, decisions in the right order (should it animate, purpose, curve, duration, interruption, exit). Default starting point. |
| `choreograph` | Several elements moving together: staggers, hero entrances, list enters, view swaps, multi-step flows. |
| `gestures` | Drag, swipe, fling, sheets, drawers, pull-to-refresh; motion that tracks the finger. |
| `design-motion-principles` | Build or audit motion in the style of Emil Kowalski, Jakub Krehel and Jhey Tompkins; audit mode emits an HTML report. |
| `find-animation-opportunities` | Read-only: where should this UI animate (and where not)? |
| `animation-vocabulary` | Name a vaguely described effect ("the bouncy popover thing"). |

## Review and fix existing motion
| Sub-skill | Best for |
|---|---|
| `review-animations` | Strict review of motion code against a high craft bar. Only when the user asks. |
| `improve-animations` | Audit a whole codebase's motion and write prioritized fix plans. |
| `remove-animations` | App "feels slow" or over-animated: subtract motion. |
| `animation-performance` | Dropped frames: composite-only properties, CSS vs WAAPI vs rAF, will-change, blur cost. |
| `fixing-motion-performance` | Quick audit-and-fix pass for layout thrashing and janky scroll-linked motion. |

## Libraries and techniques
| Sub-skill | Best for |
|---|---|
| `motion` | Motion (formerly Framer Motion) for React/Vue/vanilla, CSS `linear()` springs, MotionScore performance audits. Official. |
| `gsap-core` | GSAP tweens, easing, stagger, `matchMedia`, reduced motion. Official; start here for any GSAP work. |
| `gsap-timeline` | Sequencing with timelines and the position parameter. |
| `gsap-scrolltrigger` | Scroll-linked animation, pinning, scrub, parallax. |
| `gsap-plugins` | Flip, Draggable, SplitText, ScrollSmoother, MorphSVG, DrawSVG, CustomEase, etc. |
| `gsap-react` | `useGSAP`, refs, cleanup in React/Next.js. |
| `gsap-frameworks` | GSAP in Vue, Nuxt, Svelte, SvelteKit. |
| `gsap-performance` | GSAP-specific jank fixes. |
| `gsap-utils` | `gsap.utils` helpers (clamp, mapRange, snap, wrap…). |
| `gsap-scrolltrigger-storytelling` | Cinematic sticky product stories with progressive reveals (Meng To). |
| `animation-on-scroll` | Simple scroll reveals with IntersectionObserver + Tailwind keyframes, infinite marquees. |
| `threejs` | Interactive 3D scenes: renderer, lights, GLTF, controls, performance. |
| `animate-expo` | React Native / Expo: Reanimated, Gesture Handler, Expo Router transitions, haptics. |

## Good combinations
- Hero entrance on a landing page: `choreograph` + `gsap-timeline` (or `motion` in React).
- Scroll-driven product story: `gsap-scrolltrigger-storytelling` + `gsap-scrolltrigger`.
- "Make it feel alive": `find-animation-opportunities`, then `animate` + the project's library skill.
- Janky page: `animation-performance` (diagnose) + `fixing-motion-performance` (fix).
