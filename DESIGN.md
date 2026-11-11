---
name: Vernacular Creators
description: The Vernacular team's working tool for finding, vetting and ranking Nigerian creators.
colors:
  brand: "#171715"
  brand-ink: "#ffffff"
  accent: "#f75115"
  accent-ink: "#c64111"
  accent-soft: "#feeee8"
  canvas: "#ffffff"
  surface: "#ffffff"
  surface-2: "#f8f6f1"
  rail: "#f2eee3"
  line: "#e9e5da"
  line-strong: "#d6d0c1"
  ink: "#171715"
  ink-2: "#45443f"
  muted: "#6c6a62"
  good: "#068116"
  good-soft: "#d3fdd9"
  warn: "#98750f"
  warn-soft: "#fff3d1"
  bad: "#b42318"
  bad-soft: "#fde8e6"
  info: "#0249b3"
  info-soft: "#e6eefc"
typography:
  page-title:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  stat:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
rounded:
  control: "6px"
  panel: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "6px 10px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "16px 20px"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "32px"
---

# Vernacular Creators design system

## Overview

A compact, data-first working tool in the family of Modash, HypeAuditor and Linear, wearing the Vernacular brand. The team chose this direction on purpose (the familiar category look, done properly) over more expressive options. The rule of thumb: the data is the loudest thing on the page, and the brand shows in the details: the Alabaster side menu, Eerie Black actions, an Orange mark on whatever is active.

Used on laptops in an office, several times a day, with phones as a real second device. So: light ground, small type, tight rows, nothing decorative.

## Colors

Colours live as Tailwind theme tokens in `src/app/globals.css` (look for "BRAND COLOURS"). They come from the Vernacular Brand Identity Guidelines.

- **Eerie Black `#171715`**: text and primary buttons.
- **Alabaster `#f2eee3`** (`rail`): the side menu and phone top bar. Pages themselves are white.
- **Vernacular Orange `#f75115`** (`accent`): the active tab underline, the active menu icon, chart bars, the views-guarantee bar, focus rings and the text caret. `accent-ink #c64111` is the readable version for orange text on white.
- **Neutrals**: `surface-2` for table headers and hover rows, `line` for hairlines, `line-strong` for input borders, `ink-2` and `muted` for secondary text.
- **Status**: green, golden yellow, red and blue, each with a soft background. Red is not in the brand palette; it is kept for problems so it is never confused with Orange.

### Named rules
- **Orange is a pointer, not a paint.** It marks what is active or measured. Never use it for large fills, body text or more than one button.
- **Status always has a word.** A green, yellow or red dot or chip always sits next to a label ("Good", "Late"), so colour is never the only signal.

## Typography

One family, Outfit (the brand typeface), self-hosted through `@fontsource-variable/outfit`. Numbers use tabular figures everywhere so columns line up.

### Hierarchy
- Page title: 20px semibold.
- Section title: 14px semibold.
- Body and table text: 14px and 13px regular or medium.
- Labels, table headers, hints: 12px medium, sentence case.
- Stat values: 20px semibold.

### Named rules
- **Weight before size.** Rank is carried by weight and colour first. Nothing in the app is larger than 24px except the sign-in headline.
- **Fields are 16px on phones**, so iOS does not zoom the page when one is tapped.

## Layout

- Side menu 232px on laptops; a top bar with a slide-in drawer on phones and tablets.
- Content column up to 1320px with 32px side padding (16px on phones).
- Every page starts with `PageHeader`: title, one-line description, actions on the right, a hairline underneath.
- List pages are tables on laptops and stacked rows on phones. The creators list keeps its filters in a 232px column on the left.
- Detail pages use underlined tabs for their sections.
- Vertical rhythm: 20px between panels, 12px inside groups.

## Elevation & Depth

Flat. Panels are separated by a 1px hairline, never a shadow. The only shadows are on things that float above the page (menus, the phone drawer) and a faint one on the active menu item.

## Shapes

8px corners on panels and tables, 6px on buttons, inputs, chips and score badges. Avatars are the only circles. No pills.

## Components

All in `src/components/ui.tsx` unless noted.

- **Buttons** (`buttonClass`): 32px tall. Primary is Eerie Black, secondary is white with a border, ghost is text only, danger is red-outlined. One primary button per view.
- **Inputs** (`inputClass`, `labelClass`): 32px tall, label above, orange focus ring.
- **Card**: a flat bordered panel. Do not nest cards.
- **StatStrip + StatTile**: one bordered row of numbers split by hairlines; two per row on phones.
- **Tabs** (`tabListClass`, `tabClass`, `tabCountClass`): underlined, orange under the active one.
- **Segmented toggle**: for 2 to 4 exclusive choices (platform, chart view).
- **CreatorTable** (`creator-table.tsx`): 30px avatar, two-line creator cell, sortable headers, score badge on the right.
- **ScoreBadge**: square-cornered number on a green, yellow or red tint.
- **EngagementChip, FlagCount, EstimateTag, VerifiedBadge, FoundBadge**: small labelled markers.
- **FilterRail, FilterBar, ActiveFilterChips** (`filters.tsx`): filters at the side on laptops, behind a button on phones; each active filter shows as a removable chip.
- **EmptyState**: dashed panel with a title, one sentence and the next action.
- **PaceBar** (`project-preview.tsx`): views so far in orange, a black notch for today's pace, the guarantee at the end.

Motion: 150ms colour transitions on controls; a 220ms rise on page change; the phone drawer slides in. All of it switches off under "reduce motion".

## Do's and Don'ts

- Do put numbers in tables and strips; do not give each number its own card.
- Do write status in words next to its colour.
- Do keep one primary (black) button per view.
- Don't add shadows, gradients or rounded pills.
- Don't use Orange for anything that is not active, measured or focused.
- Don't put Alabaster behind content; it belongs to the menu.
- Don't show rates, payments, notes or contacts on anything a client can see.
