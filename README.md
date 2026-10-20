# Vernacular Creators

A tool for the Vernacular team to **find, vet and rank Instagram and YouTube creators**. You can:

- look up a creator and see their real public numbers
- see expected engagement and estimated reach per post
- spot warning signs of fake followers or bought engagement
- rank creators with a Creator Score out of 100
- build shortlists and share clean client reports

> **Current stage: Stage 2 (real data).** Once the accounts in **[docs/SETUP.md](docs/SETUP.md)** are connected, the app uses real Instagram and YouTube data, a shared database and team login. Until then it runs as a **demo on made-up sample data**, with no login.

---

## How to run it on your computer

You only need to do steps 1–2 once.

1. **Install Node.js** (the engine that runs the app). Download the "LTS" version from <https://nodejs.org> and install it like any other program.
2. **Get the code.** On the GitHub page for this project, click the green **Code** button, then **Download ZIP**, and unzip it. Or, if you use GitHub Desktop, click **Open with GitHub Desktop**.
3. **Open a terminal in the project folder.**
   - Mac: open the **Terminal** app, type `cd ` (with a space), drag the project folder into the window, and press Enter.
   - Windows: open the project folder, click the address bar, type `cmd` and press Enter.
4. Type these two commands, pressing Enter after each:

   ```
   npm install
   npm run dev
   ```

   The first one takes a minute or two. It downloads the building blocks the app needs.
5. Open **http://localhost:3000** in your browser.

To stop the app, go back to the terminal and press `Ctrl + C`.

## What's in the demo

| Screen | What it does |
|---|---|
| **Home** | Quick creator lookup, headline numbers, and the top 5 creators |
| **Creators** | Search and filter everyone in the database (platform, niche, city, size, followers, engagement, score, verified) |
| **Creator profile** | Key numbers, averages, reach estimate, warning flags, Creator Score breakdown, chart, recent posts, team notes and tags, follower history |
| **Add creators** | Look up one creator, or paste a list for bulk add with a progress bar |
| **Leaderboards** | Top creators by score, filtered by niche, city, platform and size |
| **Shortlists** | Group creators for a campaign and see combined totals |
| **Client report** | A clean, view-only page for the client, with a **Download PDF** button |
| **Campaign results** | Optional: log what posts really achieved, to improve reach estimates |
| **Settings** | Adjust score weights, how many posts to use, and the refresh time |

**Things to try:**
- Look up a made-up handle such as `@my_new_creator`. The demo creates a sample profile for it.
- Look up a handle containing `personal` or `notfound` to see the error messages.
- Open **Obinna Ekwe** or **Blessing Ike** to see warning flags in action.
- On **Settings**, drag "Views" up and "Engagement" down, and watch the scores change.

In **demo mode**, your changes (shortlists, notes, settings, added creators) are saved in your browser only. In **live mode** (after setup), everything is saved in the shared database, and the whole team sees the same creators, shortlists and settings.

## How the numbers work

All calculations use a creator's **recent posts**: the last 12 by default. Posts newer than **3 days (Instagram)** or **7 days (YouTube)** are left out because their numbers are still climbing.

- **Possibly boosted posts are set aside.** A post with more than **3×** a typical post's engagement or views (likely paid ads, or a one-off viral hit) is left out and marked on the profile, and the next older post takes its place (up to 6 months back). If more than a quarter of posts are that big, it's simply the creator's pattern and nothing is set aside. The team can also **exclude any post by hand**, for example a known ad. Instagram doesn't say which posts were promoted, and its Reel view counts include paid views, which is why this check exists.
- **Likes, comments and engagement use a "trimmed" average:** the single most extreme post at each end is dropped (10% each side) before averaging. That lands close to what other tools report, but one freak post can't swing it.
- **Views use the middle post (median)**, because views are more lopsided than likes (a few Reels take off). It's the safer figure to promise a client.
- **Engagement rate (by followers)** = average (likes + comments) per post ÷ followers. This is the classic measure most tools show.
- **Engagement rate (by views)** = (likes + comments) ÷ views, on posts that have views (Instagram Reels, YouTube videos). It shows how much the people who actually watch react, and it isn't affected by fake or inactive followers. HypeAuditor's engagement rate for Reels-heavy creators works this way.
- **Labels** (poor / average / good / great) compare each creator with others of the **same size**. Each size's benchmarks blend smoothly into the next, so there's no sudden jump between, say, 9,999 and 10,000 followers.
- **Expected engagements per post**: the middle 50% of recent posts (widened to the 10th–90th percentile when there are few posts).
- **Low confidence** is shown when fewer than 8 posts are behind the numbers.
- **Estimated reach per post** (always marked *Estimate*):
  - where at least 3 recent posts have views: the middle 50% of views × **60%**, because views include repeat plays. Logged campaign results with both reach and views adjust the 60% over time.
  - otherwise: a typical reach ratio for creators of that size, blended with logged campaign results where available.
- **Warning flags**: low engagement, very high engagement (only when backed by another sign, such as an odd likes-to-comments ratio, a follower jump, or an unrealistic engagement per view), **inactive followers** (very few views for the follower count while viewers engage normally), big swings between posts, sudden follower jumps, odd likes-to-comments ratios, possibly boosted posts, and long gaps in posting. Each one explains itself in a sentence.
- **Creator Score (0–100)**: a weighted mix of Engagement, Authenticity, Views, Consistency and Growth, each scored against creators of the same size.
  - **Engagement** uses both rates, half and half, where views exist.
  - **Authenticity** only drops for signs of fake or bought activity. Weak engagement shows as a warning but isn't counted twice.
  - If a factor has no data, it's left out and the other weights are re-balanced. The profile shows which factors were used, and a **!** marks scores based on limited data.

**Size bands:** Nano (under 10K), Micro (10K–50K), Mid-tier (50K–250K), Macro (250K–1M), Mega (1M+).

## Changing the numbers

All the adjustable numbers live in the `config` folder, with comments explaining each one:

| File | What's in it |
|---|---|
| `config/size-bands.ts` | Follower ranges for each size band |
| `config/benchmarks.ts` | "Normal" engagement per size, reach ratios, views targets |
| `config/flags.ts` | Thresholds for every warning flag |
| `config/scoring.ts` | Default score weights |
| `config/app.ts` | Posts used, refresh time, niche and city lists, niche keywords |
| `config/brand.ts` + `src/app/globals.css` | Company name and **brand colours** (look for "BRAND COLOURS") |

The look follows the **Vernacular Brand Identity Guidelines** in Figma: Eerie Black, Alabaster and Orange, the **Outfit** font, and the official wordmark (`src/components/logo.tsx`).

## For developers

| Command | |
|---|---|
| `npm run dev` | Run locally at http://localhost:3000 |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Tests: hand-checked maths, the API connections (with sample responses), and the database setup |
| `npm run check` | Typecheck + lint + tests |

Stack: Next.js 15 (App Router, TypeScript), Tailwind CSS 4, Recharts, Outfit (self-hosted via Fontsource), Supabase (Postgres + Auth), Vercel (hosting + daily cron).

```
config/              all adjustable numbers and brand settings
src/app/(team)/      team screens (behind login from Stage 2)
src/app/reports/     view-only client report
src/components/      shared UI pieces
src/lib/             the maths: metrics, reach, flags, score, filters
src/lib/data/        data layer: demo (browser storage) or live (Supabase), same hooks
src/lib/server/      official API clients (Instagram, YouTube), saving, caching
src/app/api/         lookup, refresh and the daily cron job
src/app/share/       public view-only report links
supabase/migrations/ database tables and security rules
src/sample-data/     the 40 made-up creators (seeded, so always the same)
tests/               maths tests
docs/SETUP.md        step-by-step setup for Supabase, Vercel, Meta and Google
docs/ROADMAP.md      what's done and the plan for Stage 3
```

**Data rule:** this app only uses **official APIs** (Instagram Graph API Business Discovery, YouTube Data API v3, and later TikTok Login Kit). No scraping, no fake accounts, no getting around rate limits.
