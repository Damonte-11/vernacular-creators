# Roadmap

## Stage 1: Clickable demo (done)

All screens on made-up sample data. Score, flags and reach logic working and tested.

## Stage 2: Version 1 with real data

- **Supabase**: database tables (`creators`, `creator_snapshots`, `posts`, `scores`, `flags`, `shortlists`, `shortlist_items`, `campaign_results`, `settings`) and email login for the team. Swap `src/lib/data/` from browser storage to Supabase.
- **Instagram (Graph API, Business Discovery)**:
  - Needs a Meta developer app.
  - Needs Vernacular's own Instagram professional account, linked to a Facebook Page.
  - Needs a long-lived access token.
  - Business Discovery only returns business/creator accounts. Personal accounts → clear error message.
  - Hidden like counts come back missing; they are already handled.
  - Check the current docs to see whether Reel view counts are available, and report back.
  - Respect Meta's hourly rate limits: bulk add already runs one at a time and will back off when told to slow down.
- **YouTube (Data API v3)**:
  - Look up channels by handle with `channels.list?forHandle=` (1 quota unit), never `search.list` (100 units).
  - Recent videos come from the uploads playlist, then `videos.list` for their stats.
  - Free daily allowance is 10,000 units.
  - Note: channel IDs are case-sensitive, so stop lower-casing them in `normalizeHandle` when IDs are used.
- **Caching**: only call an API when a creator's data is older than the refresh setting (default 24h).
- **Follower snapshots**: save one at every refresh, so growth and the follower-jump flag start working.
- **Refresh schedule**: a daily Vercel cron that refreshes stale creators within the quota.
- **Share links**: public, view-only report links that don't need login (random, unguessable IDs).
- **Deploy** to Vercel, with step-by-step setup guides for Meta, Google Cloud and Vercel.

## Stage 3: Version 2 (plan only)

- **TikTok**: creators connect their own accounts through TikTok's official Login Kit.
- **Creator sign-up**: creators connect Instagram / TikTok / YouTube themselves. That shares their real reach, impressions and audience data, and earns them the **Verified** badge. Reach from connected accounts is shown as real numbers, not estimates.
- **Campaign tracking**: paste live post links and track results over time.
