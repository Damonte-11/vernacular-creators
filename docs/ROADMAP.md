# Roadmap

## Stage 1: Clickable demo (done)

All screens on made-up sample data. Score, flags and reach logic working and tested.

## Stage 2: Version 1 with real data (done)

Live with Supabase, Instagram and YouTube connected (setup steps in [SETUP.md](SETUP.md)). Built:

- **Supabase**: tables (`creators`, `creator_snapshots`, `posts`, `scores`, `flags`, `shortlists`, `shortlist_items`, `campaign_results`, `settings`) with row-level security; email + password login, invite-only. Without Supabase keys the app falls back to the demo.
- **Instagram**: Graph API Business Discovery via Vernacular's own professional account. Returns followers, posts, likes and comments, plus **Reel view counts** (`view_count`, available since June 2025). Personal accounts and hidden likes are handled with clear messages.
- **YouTube**: Data API v3 with `channels.list?forHandle=` / `id=`, then the uploads playlist and `videos.list`. About 3 quota units per creator; never `search.list`.
- **Caching**: saved creators are reused until older than the refresh setting (default 24h). "Refresh data" forces a fetch.
- **Follower snapshots** at every fetch, plus the score and flags at that moment.
- **Daily refresh**: Vercel Cron at 04:00 UTC; up to 60 stale creators per run; stops early on rate limits or quota.
- **Bulk add**: one at a time, pausing automatically when a platform asks us to slow down.
- **Share links**: public, view-only report at `/share/<64-character token>`, computed on the server without notes, tags or campaign results.

Since then, the engagement maths was reviewed against HypeAuditor:
- Numbers use the last 30 posts (within 6 months, always the newest 12), with a "Recent trend" line for the newest 10.
- Possibly boosted posts are set aside and replaced; the team can exclude posts by hand.
- Engagement is shown by followers (trimmed average) and by views; views use the median post; reach = views × 60%.
- Benchmarks blend smoothly between sizes; high engagement is only flagged with evidence; Authenticity only counts signs of faking; new inactive-followers flag.

Next: tune benchmarks against real Nigerian creators as the database grows, rank against real peers once there are enough per size, and decide whether to track daily API usage on a dashboard.

## Stage 3: Version 2 (plan only)

- **TikTok**: creators connect their own accounts through TikTok's official Login Kit.
- **Creator sign-up**: creators connect Instagram / TikTok / YouTube themselves. That shares their real reach, impressions and audience data, and earns them the **Verified** badge. Reach from connected accounts is shown as real numbers, not estimates.
- **Campaign tracking**: paste live post links and track results over time.
