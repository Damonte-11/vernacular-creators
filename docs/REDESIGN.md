# Redesign report (November 2026)

Before-and-after screenshots are in `docs/redesign/`. The design system itself is in `DESIGN.md`.

## A. Audit of what was there

**Architecture (unchanged).** Next.js 15 (App Router) with TypeScript and Tailwind v4. Supabase for the database and sign-in (email and Google). Vercel hosting with nightly jobs. The browser talks to Supabase for the team's own data and to the app's own API routes for platform lookups (Instagram, YouTube, TikTok through Apify). A demo mode runs entirely in the browser.

**Screens reviewed:** Home, Creators, creator profile, Add creators, Discovered, Leaderboards, Lists, a list, Campaign results, Settings, Projects (preview), sign-in, client report and share link.

**Problems, most serious first**

1. Every fact sat in its own rounded white card on a cream page, on every screen, so nothing stood out and the app read as a template.
2. Low density: 64px table rows and 40px avatars meant about 12 creators per screen. Too few for a database heading past 2,000.
3. The creators list rendered every creator at once (slow at 2,000+) and hid its filters behind a button.
4. The creator profile was one 2,700px scroll mixing numbers, posts, team notes and history.
5. Three different tab styles, two heading scales (28 to 32px titles) and pill shapes mixed with rounded rectangles.
6. Menu was a flat list of eight links with no grouping and no search.
7. Sorting needed a separate dropdown instead of the column headers.
8. Lists were shown as cards, which stop working past a dozen lists.
9. Sign-in was an unbranded box.
10. The sign-in setup check used emoji as status icons.

## B. Brand and design system

Kept from the Vernacular Brand Identity Guidelines: Eerie Black, Alabaster, Vernacular Orange, the Outfit typeface and the official wordmark. What changed is how they are used: Alabaster moved from the page background to the side menu, pages became white, and Orange is now only a pointer (active tab, active menu icon, chart bars, focus). Full tokens, type scale, components and rules: `DESIGN.md`.

Direction: the team chose the familiar category look (Modash, HypeAuditor, Linear) over three more expressive options.

## C. Structure and navigation

- **Home**
- **Creators:** All creators, Add creators, Discovered, Leaderboards
- **Campaigns:** Projects (design preview), Lists, Campaign results
- **Settings** (bottom of the menu, with the account)

New: a search box in the menu (press `/` anywhere) that opens the creators list filtered to what you typed.

## D. Workflow changes

| Job | Before | Now |
|---|---|---|
| Find creators by criteria | Open Filters, set them, close, pick a sort from a dropdown | Filters always visible at the side; click a column to sort; each filter is a chip you can remove |
| Browse a big database | All rows on one page | 50 per page |
| Jump to a creator from anywhere | Go to Creators, then search | Press `/`, type, Enter |
| Read a profile | One long scroll | Tabs: Overview, Posts, Team notes & history |
| Scan lists | Cards | One table with status counts, followers and total rate |
| See what needs attention | Home showed four totals | Home adds background import progress, discovery count and newest lists |

## E. What was built

- New tokens and base styles (`src/app/globals.css`), including reduced-motion support and phone fixes (16px fields, no tap flash).
- Rebuilt primitives in `src/components/ui.tsx`: buttons, inputs, Card, PageHeader, SectionHeader, StatStrip and StatTile, shared tabs, ScoreBadge, EmptyState.
- New side menu and phone drawer (`app-shell.tsx`), with grouped links and quick search.
- Creators list: filter column, filter chips, sortable headers, paging (`filters.tsx`, `creator-table.tsx`, `creators/page.tsx`).
- Creator profile restructured into tabs.
- Home, Lists, Leaderboards, Settings (section menu), sign-in and Projects preview restyled or rebuilt.
- No database, API, sign-in or scoring logic was changed.

## F. Quality checks

- Type check, lint and all 111 automated tests pass. Production build passes.
- Every screen was opened in a browser at laptop (1440px) and phone (390px) width with no console errors.
- Tested by clicking: filtering and removing a filter chip, sorting by column, quick search with `/`, profile tabs.
- The Impeccable design detector reports no findings.
- The final design review was done in the same session rather than by a separate reviewer.

**Known limits**

- Checked in demo mode only. Live sign-in, Google sign-in and live data were not exercised here; check them on the preview link.
- Tablet widths were not screenshotted separately (they use the phone menu with the laptop tables).
- No public marketing website exists in this project, so none was redesigned. The public-facing pages are sign-in and the client report.
- The sample list is named after a real company ("inDrive"). It predates this work and is worth renaming.

## G. Before and after

See `docs/redesign/*-before-after.png` for Home, Creators, a creator profile, a list, Leaderboards and sign-in.
