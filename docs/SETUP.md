# Stage 2 setup guide

This connects the app to real data. There are five parts. Do them in order; each takes 10–20 minutes.

1. **Supabase**: the database and team login
2. **Vercel**: put the keys into the live site
3. **Meta (Instagram)**: lets us look up Instagram creators
4. **Google Cloud (YouTube)**: lets us look up YouTube channels
5. **Apify (TikTok)**: lets us look up TikTok creators

You can stop after any part. The app works with whatever is connected: for example, with only Supabase and YouTube, YouTube lookups work and Instagram lookups say "Instagram isn't connected yet".

> **Keep keys private.** The keys you copy below are like passwords. Paste them only into Vercel (or a file called `.env.local` on your own computer). Never put them in GitHub, email or chat.

Menus on these websites change from time to time. If a button has a slightly different name, look for the closest match, or send me a screenshot.

---

## Part 1: Supabase (database + team login)

### 1.1 Create the project
1. Go to <https://supabase.com> and click **Start your project**. Sign in with GitHub (easiest) or email.
2. Click **New project**.
3. **Name:** `vernacular-creators`. **Database password:** click **Generate a password** and save it in your password manager (you won't need it day to day).
4. **Region:** choose the one closest to Nigeria, usually **West EU (London)** or **West EU (Ireland)**.
5. The free plan is fine to start. Click **Create new project** and wait a minute or two.

### 1.2 Create the tables
1. In the left menu, click **SQL Editor**, then **New query**.
2. Open this file on GitHub: `supabase/migrations/0001_init.sql`. Click the **Copy raw file** button (two overlapping squares, top right of the file).
3. Paste it into the Supabase query box and click **Run**. You should see "Success. No rows returned".

### 1.3 Switch off public sign-ups
Only people you add should be able to log in.
1. Left menu: **Authentication** → **Sign In / Providers** (on some versions: **Providers** or **Settings**).
2. Turn **off** "Allow new users to sign up". Click **Save**.
3. Make sure **Email** is enabled as a provider (it is by default).

### 1.4 Add your team
For each person:
1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter their work email and a temporary password. Tick **Auto Confirm User**. Click **Create user**.
3. Send them the password privately. (To change someone's password later, open their user and choose **Reset password** or create the user again.)

### 1.5 Copy three values for Part 2
1. Left menu: **Project Settings** (gear icon) → **API Keys**. On older versions, it's **Project Settings** → **API**.
2. Copy and keep these somewhere safe for the next part:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`). It's on the **Data API** page, or the project's home page under "Project API".
   - **Publishable key** (starts with `sb_publishable_`). On older versions, the **anon public** key.
   - **Secret key** (starts with `sb_secret_`; click **Reveal**). On older versions, the **service_role** key.

### 1.6 Sign in with Google (optional, recommended)
The team can sign in with their Google account instead of a password. It stays invite-only: Google sign-in only works for emails you've added in 1.4, so use each person's Google (or Google Workspace) email there.

**In Google Cloud** (the same project as YouTube in Part 4, or a new one):
1. Go to <https://console.cloud.google.com>, pick the project, then search for **Google Auth Platform** (on older screens: **APIs & Services** → **OAuth consent screen**). Click **Get started**.
2. **App name:** `Vernacular Creators`. **User support email:** yours. **Audience:** choose **Internal** if everyone uses a Vernacular Google Workspace email; otherwise **External**. Add your email as the contact and click **Create**.
3. If you chose External: go to **Audience** and click **Publish app** (so anyone you've invited can use it; it only asks for name and email, so Google doesn't need to review it).
4. Go to **Clients** → **Create client**. **Application type:** Web application. **Name:** `Vernacular Creators`.
5. Under **Authorised redirect URIs**, click **Add URI** and paste the **Callback URL** from Supabase: in Supabase, **Authentication** → **Sign In / Providers** → **Google**, it's shown near the bottom and looks like `https://abcdefgh.supabase.co/auth/v1/callback`. Click **Create**.
6. Copy the **Client ID** and **Client secret** that appear.

**In Supabase:**
7. **Authentication** → **Sign In / Providers** → **Google**: switch it **on**, paste the Client ID and Client secret, and click **Save**.
8. **Authentication** → **URL Configuration**:
   - **Site URL:** `https://vernacular-creators.vercel.app`
   - **Redirect URLs** → **Add URL**: `https://vernacular-creators.vercel.app/**`, and for preview links also `https://*-damonte.vercel.app/**`. Save.

Then click **Sign in with Google** on the sign-in page. If it says the account isn't on the team, that Google email hasn't been added in 1.4.

---

## Part 2: Vercel (put the keys into the live site)

1. Open <https://vercel.com>, then your **vernacular-creators** project.
2. Click **Settings** → **Environment Variables**.
3. Add each of the following. For each one, tick **Production** and **Preview**, then click **Save**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from 1.5 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key from 1.5 |
| `SUPABASE_SECRET_KEY` | Secret key from 1.5 |
| `CRON_SECRET` | Any long random password (40+ characters), e.g. from your password manager's generator |

4. Go to **Deployments**, click the **⋯** next to the latest deployment for the `stage-2` branch, and choose **Redeploy**. Keys only take effect after a redeploy.
5. Open that deployment's link. You should see a **Sign in** page. Sign in with a user from step 1.4. The creators list starts empty: that's correct.

Later, when Instagram and YouTube are connected (Parts 3 and 4), you'll add more variables here and redeploy again.

---

## Part 3: Meta (Instagram)

We use Meta's official **Instagram Graph API** feature called **Business Discovery**. It reads the public numbers of business and creator accounts, using Vernacular's own Instagram account. Personal accounts can't be looked up; that's Instagram's rule.

### 3.1 Check Vernacular's Instagram account
1. In the Instagram app, go to Vernacular's profile → **☰** → **Settings and activity** → **Account type and tools**. It must be a **Professional** account (Business or Creator).
2. It must be linked to a **Facebook Page** that you manage. In the Instagram app: **Edit profile** → **Page** (or on Facebook: your Page → **Settings** → **Linked accounts** → **Instagram**). Connect it if it isn't.

### 3.2 Create a Meta developer app
1. Go to <https://developers.facebook.com> and log in with the Facebook account that manages the Page. If asked, click **Get started** and register as a developer (free).
2. Click **My Apps** → **Create app**.
3. **App name:** `Vernacular Creators`. Add your contact email. Click **Next**.
4. When asked for a **use case**, choose **Other**. When asked for an **app type**, choose **Business**. (If you only see use cases, pick the one about managing **Instagram** content or messaging with **Facebook Login**.)
5. If asked for a **business portfolio**, choose Vernacular's (or skip). Click **Create app**.
6. On the app dashboard, find **Instagram** (under "Add products") and click **Set up**. If there's a choice, choose **API setup with Facebook login**.

You don't need to submit the app for Meta's review. It stays in "Development" mode, which is fine because it only uses Vernacular's own account.

### 3.3 Get a permanent access token
1. Open the **Graph API Explorer**: <https://developers.facebook.com/tools/explorer/>
2. Top right: **Meta App** → choose `Vernacular Creators`. **User or Page** → **User Token**.
3. Under **Permissions**, add all of these: `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`.
4. Click **Generate Access Token**. In the pop-up, log in, choose **Vernacular's Facebook Page** and **Instagram account**, and allow everything.
5. Make the token long-lived:
   - Click the small **ⓘ** next to the token → **Open in Access Token Tool**. Or go to <https://developers.facebook.com/tools/debug/accesstoken/>, paste the token, and click **Debug**.
   - At the bottom, click **Extend Access Token**, then **Debug** on the new token. Copy this new, long-lived token.
6. Back in the Graph API Explorer, paste the long-lived token into the **Access Token** box.
7. In the query box, type `me/accounts` and click **Submit**.
8. Find Vernacular's Page in the results and copy its **access_token** and its **id**.
9. Check the Page token: paste it into the Access Token Debugger (from step 5). **Expires** should say **Never**. This is the token we'll use.

### 3.4 Find the Instagram account ID
1. In the Graph API Explorer, paste the **Page token** into the Access Token box.
2. Query: `PAGE_ID?fields=instagram_business_account` (replace `PAGE_ID` with the id from 3.3). Click **Submit**.
3. Copy the `id` inside `instagram_business_account`. It's a long number starting with `178414…`.

### 3.5 Test it
In the same Explorer, run (replace `IG_ID` with the number from 3.4):
```
IG_ID?fields=business_discovery.username(instagram){followers_count,media_count}
```
You should see Instagram's own follower count. If so, it works.

### 3.6 Add to Vercel
Add these in Vercel (as in Part 2), then redeploy:

| Name | Value |
|---|---|
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | The number from 3.4 |
| `INSTAGRAM_ACCESS_TOKEN` | The Page token from 3.3 |

**If Instagram lookups later say the token "has expired":** this happens if someone changes the Facebook password or removes the app's access. Repeat 3.3 and update `INSTAGRAM_ACCESS_TOKEN` in Vercel.

**Limits:** Meta allows roughly 200 lookups an hour for one account. The app looks creators up one at a time, pauses when Meta asks it to slow down, and reuses saved data for 24 hours, so you shouldn't hit this in normal use.

---

## Part 4: Google Cloud (YouTube)

1. Go to <https://console.cloud.google.com> and sign in with a Vernacular Google account. Accept the terms if asked.
2. Top left, click the project picker → **New project**. Name: `vernacular-creators`. Click **Create**, then make sure that project is selected.
3. Search bar at the top: type **YouTube Data API v3** → click it → **Enable**.
4. Left menu: **APIs & Services** → **Credentials** → **+ Create credentials** → **API key**. Copy the key.
5. Click **Edit API key** (or the key's name). Under **API restrictions**, choose **Restrict key** and tick **YouTube Data API v3** only. Leave "Application restrictions" as **None**. Click **Save**.
6. Add it in Vercel and redeploy:

| Name | Value |
|---|---|
| `YOUTUBE_API_KEY` | The key from step 4 |

**Limits:** the free allowance is 10,000 "units" a day. One creator lookup or refresh uses about 3 units, so roughly 3,000 a day. It resets at midnight Pacific Time (8am or 9am in Lagos). No billing account is needed.

---

## Part 5: Apify (TikTok)

TikTok has no official way to look up other creators' numbers, so the app uses **Apify**, a paid service that collects a TikTok profile's public numbers and latest videos for us. This goes against TikTok's terms of service: TikTok can block it at any time, and the risk sits with Vernacular. If Apify stops working, Instagram and YouTube are not affected.

**Cost:** about **$0.13 per lookup** (36 videos at $0.0037 each). Apify's free plan gives **$5 of credit a month**, so the app allows **30 TikTok lookups or refreshes a month** and stops there until the 1st. TikTok creators are not part of the daily refresh: saved ones are reused for 30 days, and **Refresh data** on a profile fetches new numbers (it counts towards the 30).

1. Go to <https://apify.com> and click **Sign up** (free; no card needed). Use a Vernacular email.
2. In the Apify console, left menu: **Settings** → **API & Integrations**. Copy the **Personal API token**.
3. Optional but recommended: **Settings** → **Usage & billing** (or **Limits**) → set a monthly usage limit of **$5**, so Apify can never charge you.
4. Add it in Vercel and redeploy:

| Name | Value |
|---|---|
| `APIFY_TOKEN` | The token from step 2 |
| `TIKTOK_MONTHLY_LOOKUPS` | Optional. Leave it out for 30. |

5. Run database update `0006_tiktok.sql` (below).

A TikTok lookup takes **30 seconds to 2 minutes**, as Apify has to open the profile. A normal lookup costs about $0.13; Apify's lowest per-lookup safety cap for this service is $0.50, which a lookup won't reach.

---

## Database updates

When the app gains a feature that needs a database change, there's a new numbered file in `supabase/migrations/`. Run each one once, in order, in **Supabase → SQL Editor → New query → paste → Run**:

- `0001_init.sql`: the tables (Part 1)
- `0002_post_exclusions.sql`: lets the team exclude individual posts (e.g. known ads)
- `0003_engagement_update.sql`: per-platform post ages (3 days Instagram, 7 days YouTube)
- `0004_thirty_posts.sql`: base the numbers on the last 30 posts (was 12)
- `0005_instagram_views_share.sql`: count 70% of Instagram views (they include Facebook and paid views), adjustable in Settings
- `0006_tiktok.sql`: allow TikTok creators
- `0007_linked_accounts.sql`: link a person's accounts across platforms (Instagram, TikTok, YouTube)

## What happens after setup

- **Lookups:** creators you look up are saved. Looking them up again within 24 hours (the "Refresh data after" setting) uses the saved copy and costs no API allowance. **Refresh data** on a profile fetches fresh numbers straight away.
- **Daily refresh:** every day at 05:00 Lagos time, Vercel refreshes creators whose data is older than the setting, up to 60 per run. It stops early if a platform asks it to slow down.
- **Follower history:** each refresh saves the follower count. "Growth" and "sudden follower jump" checks start working after about two weeks.
- **Share links:** on a shortlist, **Copy share link** gives a view-only report link that works without signing in. It hides team notes, tags and campaign results.

## Running it on your own computer (optional)

1. Copy `.env.example` to a new file named `.env.local` in the project folder and fill in the values.
2. Run `npm install`, then `npm run dev`, and open <http://localhost:3000>.

Without `.env.local`, the app runs the demo on sample data.
