# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The whole Vernacular marketing team (campaign managers, account leads and strategists) at Vernacular, a brand, marketing and studio agency in Lagos. They find, vet and rank Nigerian creators, group them into campaigns, and track how those campaigns perform. They work mostly on laptops, and check numbers on their phones between meetings.

Clients will later be able to see their own projects; that is not built yet.

## Product Purpose

Vernacular Creators is the team's internal tool for creator work: a database of Instagram, YouTube and TikTok creators with honest numbers (engagement, views, a 0–100 Creator Score, warning flags), plus the campaigns ("projects") that use them. Success means the team can pick the right creators quickly, run a campaign without spreadsheet chaos, and report results a client believes.

## Positioning

Vernacular markets through communities, not at people ("Where others buy reach, we build belief"). The tool reflects that: it judges creators on how their audiences actually respond (engagement, engagement by views, authenticity), not on follower counts, and it is built around Vernacular's own services and terms.

## Operating Context

- Services (from Introduction to Vernacular): Marketing moves the language (Chorus, VAN, Dialect, Cosign, Landmark, Experiential); Brand & Design finds it; Studio makes it. Every client starts with a discovery call.
- **Chorus** is Vernacular's creator / influencer marketing service, run three ways: **Seedlings** (many nano–micro creators posting and commenting in bulk), **Headliners** (mid-tier and mega creators for reach) and **Salad** (both mixed).
- A Chorus campaign has a client, a vertical, a window (dates), and a **views guarantee** given in writing. Reach is not tracked.
- Campaign metrics the team reports: number of creators and posts, views, engagements, engagement rate by views, posting cadence. Cost per 1,000 views (based on what each influencer was actually paid) and payments come later.
- Post links arrive from creators and are entered in the app or in the team's Google Sheets; a sheet-reading agent is planned.
- Vernacular also works white-label for agencies, under the agency's name.

## Capabilities and Constraints

- Next.js on Vercel, Supabase database and login (email/password and Google), invite-only team accounts.
- Creator data: Instagram and YouTube through official APIs; TikTok through Apify (paid, capped at 30 lookups a month). Instagram allows roughly 200 lookups an hour.
- Existing: creator search and profiles, linked accounts across platforms, leaderboards, Lists (to be replaced by Projects), client share reports, automatic discovery, spreadsheet import, background import queue.
- Undecided / not built yet: Projects page (being designed), client logins and roles, CPM and payments, the sheet-sync agent, other service types beyond Chorus.

## Brand Commitments

Vernacular brand: Eerie Black, Alabaster and Orange, the Outfit typeface, the official wordmark (from the Vernacular Brand Identity Guidelines in Figma). Brand lines: "We don't market at people. We market through communities." and "Where others buy reach, we build belief."

## Evidence on Hand

- Introduction to Vernacular (team guide, PDF) for services and terms.
- No real campaign results, client names or testimonials are in the app yet; designs use clearly marked sample data and must not invent real clients or results.

## Product Principles

1. **Guarantee views, report honestly.** The views guarantee is front and centre; everything else is shown as it is, good or bad.
2. **Communities over reach.** Engagement and engagement by views count as much as raw views.
3. **Team-only data stays private.** Rates, payments, notes and contacts never reach clients, even once they can log in.

## Accessibility & Inclusion

Laptop first, with phones as a real second device: every screen must work and read well at phone width.
