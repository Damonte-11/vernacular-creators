/**
 * SAMPLE DATA. Made-up creators for the Stage 1 demo.
 * None of these are real people or real accounts. Every handle ends in
 * "_demo" so it can't be mistaken for a real one.
 *
 * Numbers are generated from a fixed seed, so they are the same every time.
 * Some creators are deliberately "problem" accounts so the warning flags have
 * something to show.
 */
import { platformName } from "@/lib/platforms";
import { ENGAGEMENT_BENCHMARKS, VIEWS_RATIO_TARGETS } from "@config/benchmarks";
import type { Creator, Platform, Post, PostType, Snapshot } from "@/lib/types";
import { sizeBandFor } from "@/lib/size-bands";
import { DAY_MS } from "@/lib/stats";

type Archetype =
  | "fake_followers" // very low engagement
  | "bought_likes" // unusually high engagement and too few comments
  | "erratic" // big swings between posts
  | "dormant" // hasn't posted in weeks
  | "pods" // too many comments for the likes
  | "jump" // sudden follower jump
  | "hidden_likes" // hides like counts
  | "new" // only one follower snapshot so far
  | "gap" // a long gap between recent posts
  | "boosted"; // two posts pushed with paid ads

interface Spec {
  name: string;
  handle: string;
  platform: Platform;
  niche: string;
  city: string;
  followers: number;
  bio: string;
  arch?: Archetype[];
  /** Instagram: share of posts that are Reels (these have public views). */
  reels?: number;
  verified?: boolean;
  tags?: string[];
  /** Same value = same person on another platform. */
  person?: string;
}

const SPECS: Spec[] = [
  // ── Instagram ───────────────────────────────────────────────
  { name: "Tolu Bankole", handle: "tolukitchen_demo", platform: "instagram", niche: "Food", city: "Lagos", followers: 18_400, bio: "Easy Naija recipes for busy people 🍲 Jollof every Sunday.", reels: 0.5, tags: ["responsive"] },
  { name: "Chidi Okafor", handle: "chidilaughs_demo", platform: "instagram", niche: "Comedy", city: "Lagos", followers: 420_000, bio: "Comedian. Skits about everyday Lagos wahala 😂", reels: 0.8, verified: true },
  { name: "Amaka Eze", handle: "amakastyles_demo", platform: "instagram", niche: "Fashion", city: "Lagos", followers: 86_000, bio: "Fashion stylist • Ankara with a twist • Bookings via email", reels: 0.3 },
  { name: "Bolaji Adeyemi", handle: "bolajitech_demo", platform: "instagram", niche: "Tech", city: "Lagos", followers: 34_500, bio: "Phone and gadget reviews in plain English 📱", reels: 0.6 },
  { name: "Zainab Musa", handle: "zainabeats_demo", platform: "instagram", niche: "Food", city: "Abuja", followers: 7_800, bio: "Abuja food spots and home cooking. Honest reviews only.", reels: 0.4, arch: ["new"] },
  { name: "Ifeanyi Nwosu", handle: "ifeanyiskits_demo", platform: "instagram", niche: "Comedy", city: "Port Harcourt", followers: 1_350_000, bio: "Skits • Comedy • PH to the world", reels: 0.9, person: "ifeanyi" },
  { name: "Funmi Alade", handle: "funmilives_demo", platform: "instagram", niche: "Lifestyle", city: "Lagos", followers: 52_000, bio: "Mum of two. Lifestyle, home and family vlog.", reels: 0.2, arch: ["hidden_likes"] },
  { name: "Kelechi Obi", handle: "kelechibeats_demo", platform: "instagram", niche: "Music", city: "Lagos", followers: 210_000, bio: "Afrobeats singer & songwriter 🎶 New single out now", reels: 0.7, arch: ["boosted"] },
  { name: "Hauwa Bello", handle: "hauwamodest_demo", platform: "instagram", niche: "Fashion", city: "Abuja", followers: 23_000, bio: "Modest fashion & outfit ideas 🧕", reels: 0.35 },
  { name: "Segun Afolabi", handle: "segunreviews_demo", platform: "instagram", niche: "Tech", city: "Ibadan", followers: 12_600, bio: "Tech reviews and gadget unboxing from Ibadan", reels: 0.5, arch: ["pods"] },
  { name: "Ngozi Umeh", handle: "ngozicooks_demo", platform: "instagram", niche: "Food", city: "Port Harcourt", followers: 64_000, bio: "Chef. Native soups, seafood and party trays 🦐", reels: 0.45 },
  { name: "Dayo Ogunleye", handle: "dayodoeslife_demo", platform: "instagram", niche: "Lifestyle", city: "Ibadan", followers: 9_200, bio: "Lifestyle, faith and Ibadan living", reels: 0, arch: ["new"] },
  { name: "Ada Nnaji", handle: "adaglam_demo", platform: "instagram", niche: "Fashion", city: "Lagos", followers: 145_000, bio: "Style • Beauty • Fashion week diaries", reels: 0.4, arch: ["bought_likes"] },
  { name: "Musa Garba", handle: "musalaughs_demo", platform: "instagram", niche: "Comedy", city: "Abuja", followers: 98_000, bio: "Funny skits in Hausa and English 😂", reels: 0.85, arch: ["jump"] },
  { name: "Yemi Coker", handle: "yemiplays_demo", platform: "instagram", niche: "Music", city: "Lagos", followers: 31_000, bio: "Producer & DJ. Amapiano and Afrobeats mixes.", reels: 0.6 },
  { name: "Blessing Ike", handle: "blessingbites_demo", platform: "instagram", niche: "Food", city: "Lagos", followers: 275_000, bio: "Food blogger. Lagos eats, recipes and restaurant reviews", reels: 0.55, arch: ["fake_followers"] },
  { name: "Tunde Bakare", handle: "tundetalkstech_demo", platform: "instagram", niche: "Tech", city: "Abuja", followers: 4_300, bio: "Software developer sharing coding tips", reels: 0.3, arch: ["new"] },
  { name: "Ifeoma Chukwu", handle: "ifeomaoutfits_demo", platform: "instagram", niche: "Fashion", city: "Port Harcourt", followers: 41_000, bio: "Everyday outfits under ₦20k 👗", reels: 0.5, arch: ["erratic"] },
  { name: "Kunle Ajayi", handle: "kunlecomedy_demo", platform: "instagram", niche: "Comedy", city: "Ibadan", followers: 15_800, bio: "Comedy skits about university life", reels: 0.8 },
  { name: "Halima Yusuf", handle: "halimalifestyle_demo", platform: "instagram", niche: "Lifestyle", city: "Abuja", followers: 180_000, bio: "Lifestyle • Travel • Home decor", reels: 0.4, verified: true, person: "halima" },
  { name: "Emeka Obi", handle: "emekafits_demo", platform: "instagram", niche: "Lifestyle", city: "Lagos", followers: 27_000, bio: "Fitness and lifestyle. Gym every morning 💪", reels: 0.5, arch: ["dormant"] },
  { name: "Sade Lawal", handle: "sadesings_demo", platform: "instagram", niche: "Music", city: "Ibadan", followers: 58_000, bio: "Singer. Covers and originals 🎤", reels: 0.65 },
  { name: "Obinna Ekwe", handle: "obinnaeats_demo", platform: "instagram", niche: "Food", city: "Abuja", followers: 520_000, bio: "Street food hunter. Suya, boli and everything in between", reels: 0.75, arch: ["bought_likes", "jump"] },
  { name: "Rukayat Salami", handle: "rukystyle_demo", platform: "instagram", niche: "Fashion", city: "Lagos", followers: 2_100_000, bio: "Fashion • Beauty • Brand partnerships via management", reels: 0.5 },
  { name: "Femi Oduya", handle: "femigadgets_demo", platform: "instagram", niche: "Tech", city: "Port Harcourt", followers: 76_000, bio: "Gadgets, smart home and tech deals", reels: 0.5, arch: ["fake_followers"] },
  { name: "Chioma Agu", handle: "chiomalaughs_demo", platform: "instagram", niche: "Comedy", city: "Port Harcourt", followers: 39_000, bio: "Skits with my mum 😂 Family comedy", reels: 0.9, arch: ["gap"] },
  { name: "Gbenga Shittu", handle: "gbengavibes_demo", platform: "instagram", niche: "Music", city: "Abuja", followers: 11_500, bio: "Afro-fusion artist from Abuja", reels: 0.5 },
  { name: "Esther Okon", handle: "estherhome_demo", platform: "instagram", niche: "Lifestyle", city: "Port Harcourt", followers: 6_400, bio: "Small home, big style. Lifestyle and decor", reels: 0.3 },

  // ── YouTube ─────────────────────────────────────────────────
  { name: "Lagos Tech Desk", handle: "lagostechdesk_demo", platform: "youtube", niche: "Tech", city: "Lagos", followers: 312_000, bio: "Phone reviews, tech news and buying guides for Nigerians." },
  { name: "Mama Nkechi's Kitchen", handle: "mamankechikitchen_demo", platform: "youtube", niche: "Food", city: "Enugu", followers: 88_000, bio: "Traditional recipes step by step. New video every Friday." },
  { name: "Wale Unfiltered", handle: "waleunfiltered_demo", platform: "youtube", niche: "Comedy", city: "Lagos", followers: 1_120_000, bio: "Comedy sketches and pranks. Business enquiries in About.", verified: true },
  { name: "Abuja Eats", handle: "abujaeats_demo", platform: "youtube", niche: "Food", city: "Abuja", followers: 24_000, bio: "Restaurant reviews across Abuja.", arch: ["new"] },
  { name: "Style by Temi", handle: "stylebytemi_demo", platform: "youtube", niche: "Fashion", city: "Lagos", followers: 46_500, bio: "Fashion hauls, styling tips and thrift flips." },
  { name: "Naija Beats Lab", handle: "naijabeatslab_demo", platform: "youtube", niche: "Music", city: "Lagos", followers: 156_000, bio: "Music production tutorials and beat breakdowns." },
  { name: "The Garden City Vlog", handle: "gardencityvlog_demo", platform: "youtube", niche: "Lifestyle", city: "Port Harcourt", followers: 13_200, bio: "Daily life vlogs from Port Harcourt.", arch: ["dormant"] },
  { name: "Code with Kemi", handle: "codewithkemi_demo", platform: "youtube", niche: "Tech", city: "Ibadan", followers: 67_000, bio: "Beginner coding tutorials. Learn to code for free." },
  { name: "Laugh Out Lekki", handle: "laughoutlekki_demo", platform: "youtube", niche: "Comedy", city: "Lagos", followers: 540_000, bio: "Weekly comedy series.", arch: ["fake_followers"] },
  { name: "Ibadan Food Tour", handle: "ibadanfoodtour_demo", platform: "youtube", niche: "Food", city: "Ibadan", followers: 8_900, bio: "Amala spots and food tours around Ibadan." },
  { name: "Glow with Fola", handle: "glowwithfola_demo", platform: "youtube", niche: "Lifestyle", city: "Abuja", followers: 205_000, bio: "Lifestyle, beauty and skincare routines.", arch: ["erratic"] },
  { name: "Afro Vibes Daily", handle: "afrovibesdaily_demo", platform: "youtube", niche: "Music", city: "Abuja", followers: 3_300_000, bio: "Afrobeats music videos and artist interviews." },
  // ── The same people on other platforms (linked by "person") ─
  { name: "Halima Yusuf", handle: "halimayusuf_demo", platform: "tiktok", niche: "Lifestyle", city: "Abuja", followers: 410_000, bio: "Lifestyle, travel and home tours. IG: @halimalifestyle_demo", person: "halima" },
  { name: "Halima Yusuf", handle: "halimahome_demo", platform: "youtube", niche: "Lifestyle", city: "Abuja", followers: 62_000, bio: "Long-form home makeovers and travel vlogs.", person: "halima" },
  { name: "Ifeanyi Nwosu", handle: "ifeanyinwosu_demo", platform: "tiktok", niche: "Comedy", city: "Port Harcourt", followers: 2_100_000, bio: "Skits every day. PH to the world.", person: "ifeanyi" },
];

const CAPTIONS: Record<string, string[]> = {
  Food: ["Sunday jollof special", "5-minute breakfast idea", "Trying the viral suya spot", "Egusi the easy way", "Party small chops tray", "Rating plantain chips"],
  Comedy: ["When NEPA takes light at the wrong time", "Lagos traffic be like", "Me vs my landlord", "Mum finds my phone", "Danfo conductor chronicles", "Exam season wahala"],
  Fashion: ["3 ways to style one Ankara", "Thrift haul under ₦15k", "Wedding guest outfit ideas", "Office looks this week", "Owambe ready", "Styling a white shirt"],
  Tech: ["Is this phone worth it?", "Budget earbuds compared", "Laptop for students", "Battery life test", "Setting up a smart home", "Top 5 apps this month"],
  Music: ["New single snippet", "Studio session", "Cover: fan request", "Behind the beat", "Live at the show", "Acoustic version"],
  Lifestyle: ["Morning routine", "Weekend with the kids", "Home makeover reveal", "Market run vlog", "Self-care Sunday", "What I spent this week"],
};

/** Tiny seeded random generator (mulberry32), so sample data never changes. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * "Now" for the sample data: midday UTC today. Rounding to the day keeps the
 * numbers stable across the day and identical on server and browser.
 */
export function sampleNow(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
}

export function buildSampleCreator(spec: Spec, now: number): Creator {
  const r = rng(hash(spec.handle));
  const arch = new Set(spec.arch ?? []);
  const band = sizeBandFor(spec.followers);
  const isIG = spec.platform === "instagram";
  const quality = 0.25 + r() * 0.65; // where they sit inside "normal"

  // How noisy engagement is from post to post.
  const spread = arch.has("erratic") ? 2.4 : 0.3 + r() * 0.5;
  const noise = () => {
    // Log-normal-ish multiplier with mean ≈ 1.
    const n = (r() + r() + r() - 1.5) * 2; // roughly -3..3
    return Math.exp(n * spread * 0.5 - (spread * spread) / 8);
  };

  // Likes per comment.
  let likesPerComment = 25 + r() * 50;
  if (arch.has("pods")) likesPerComment = 3 + r() * 2;
  if (arch.has("bought_likes")) likesPerComment = 320 + r() * 150;

  // Posting rhythm.
  const isTT = spec.platform === "tiktok";
  const perMonth = isIG ? 6 + r() * 8 : isTT ? 8 + r() * 12 : 2 + r() * 4;
  const count = 36;
  const posts: Post[] = [];
  let t = now - (arch.has("dormant") ? 46 : 0.4) * DAY_MS; // most have a post from the last few hours
  for (let i = 0; i < count; i++) {
    if (arch.has("gap") && i === 4) t -= 38 * DAY_MS;
    const type: PostType = isIG
      ? r() < (spec.reels ?? 0.4)
        ? "reel"
        : r() < 0.4
          ? "carousel"
          : "image"
      : isTT
        ? r() < 0.15
          ? "slideshow"
          : "video"
        : r() < 0.3
          ? "short"
          : "video";

    let likes: number;
    let comments: number;
    let views: number | null = null;

    if (isIG) {
      const b = ENGAGEMENT_BENCHMARKS.instagram[band];
      let er = b.poor + quality * (b.good - b.poor);
      if (arch.has("fake_followers")) er = b.poor * 0.3;
      if (arch.has("bought_likes")) er = b.good * 2.6;
      if (type === "reel") er *= 1.3;
      const boost = arch.has("boosted") && (i === 2 || i === 6) ? 6 : 1; // paid promotion
      const engagements = spec.followers * er * noise() * boost;
      likes = Math.round((engagements * likesPerComment) / (likesPerComment + 1));
      comments = Math.max(0, Math.round(engagements / (likesPerComment + 1)));
      if (type === "reel") {
        let vr = VIEWS_RATIO_TARGETS.instagram[band] * (0.6 + quality);
        if (arch.has("fake_followers")) vr *= 0.1; // bought followers never watch
        views = Math.round(spec.followers * vr * noise() * boost);
      }
    } else {
      let vr = VIEWS_RATIO_TARGETS[spec.platform][band] * (0.6 + quality) * (type === "short" ? 1.8 : 1);
      if (arch.has("fake_followers")) vr *= 0.08;
      views = Math.round(spec.followers * vr * noise());
      const likeRate = arch.has("bought_likes") ? 0.15 : isTT ? 0.04 + r() * 0.05 : 0.025 + r() * 0.025;
      likes = Math.round(views * likeRate);
      comments = Math.max(0, Math.round(likes / likesPerComment));
    }

    const caps = CAPTIONS[spec.niche] ?? CAPTIONS.Lifestyle;
    posts.push({
      id: `${spec.handle}-p${i + 1}`,
      platformPostId: `sample_${hash(spec.handle + i).toString(36)}`,
      type,
      postedAt: new Date(t).toISOString(),
      likes: arch.has("hidden_likes") ? null : likes,
      comments,
      views,
      url: "",
      caption: caps[Math.floor(r() * caps.length)],
    });
    t -= (30 / perMonth) * (0.6 + r() * 0.8) * DAY_MS;
  }

  return {
    id: `sample-${spec.handle}`,
    platform: spec.platform,
    platformId: `sample_${hash(spec.handle).toString(36)}`,
    handle: spec.handle,
    name: spec.name,
    photoUrl: null,
    bio: spec.bio,
    niche: spec.niche,
    city: spec.city,
    country: "Nigeria",
    followers: spec.followers,
    mediaCount: Math.round(80 + r() * 900),
    accountType: isIG ? (r() < 0.5 ? "creator" : "business") : isTT ? "creator" : "channel",
    verified: !!spec.verified,
    personId: spec.person ? `sample-person-${spec.person}` : null,
    lastFetchedAt: new Date(now - r() * 20 * 60 * 60 * 1000).toISOString(),
    notes: "",
    tags: spec.tags ?? [],
    posts,
    snapshots: buildSnapshots(spec.followers, arch, r, now),
    isSample: true,
  };
}

function buildSnapshots(current: number, arch: Set<Archetype>, r: () => number, now: number): Snapshot[] {
  if (arch.has("new")) return [{ followers: current, capturedAt: new Date(now).toISOString() }];

  // Weekly snapshots over the last 6 weeks, working backwards from today.
  const monthlyGrowth = arch.has("dormant") ? -0.01 : 0.004 + r() * 0.035;
  const weekly = Math.pow(1 + monthlyGrowth, 7 / 30);
  const snaps: Snapshot[] = [];
  let followers = current;
  for (let w = 0; w <= 6; w++) {
    snaps.push({ followers: Math.round(followers), capturedAt: new Date(now - w * 7 * DAY_MS).toISOString() });
    followers /= weekly;
    // A sudden jump two weeks ago: before it, they had about 25% fewer followers.
    if (arch.has("jump") && w === 1) followers /= 1.27;
  }
  // The jump happened between two daily refreshes, so add the day before it too.
  if (arch.has("jump")) {
    const before = snaps[2];
    snaps.push({ followers: before.followers, capturedAt: new Date(now - 10 * DAY_MS).toISOString() });
  }
  return snaps.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export function sampleCreators(now: number = sampleNow()): Creator[] {
  return SPECS.map((s) => buildSampleCreator(s, now));
}

/**
 * Stage 1 only: pretend to look up a creator that isn't in the database yet.
 * Builds a believable made-up profile from the handle. Some handles trigger
 * the error messages the real lookup will show.
 */
export function simulateLookup(
  platform: Platform,
  rawHandle: string,
  now: number = sampleNow(),
): { ok: true; creator: Creator } | { ok: false; error: string } {
  const handle = rawHandle.trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { ok: false, error: "Type a handle first." };
  if (!/^[a-z0-9._-]{2,40}$/.test(handle)) {
    return { ok: false, error: "That doesn't look like a valid handle. Use letters, numbers, dots and underscores only." };
  }
  if (handle.includes("personal")) {
    return {
      ok: false,
      error: "This is a personal account. Instagram only shares data for business or creator accounts.",
    };
  }
  if (handle.includes("notfound") || handle.includes("missing")) {
    return { ok: false, error: `We couldn't find @${handle} on ${platformName(platform)}. Check the spelling.` };
  }

  const r = rng(hash(handle + platform));
  const niches = Object.keys(CAPTIONS);
  const cities = ["Lagos", "Abuja", "Port Harcourt", "Ibadan"];
  const niche = niches[Math.floor(r() * niches.length)];
  const followers = Math.round(Math.pow(10, 3.5 + r() * 3)); // ~3K to ~3M
  const spec: Spec = {
    name: handle.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    handle,
    platform,
    niche,
    city: cities[Math.floor(r() * cities.length)],
    followers,
    bio: `${niche} creator. (Made-up sample profile: real lookups arrive in Stage 2.)`,
    reels: r(),
    arch: ["new"],
  };
  const creator = buildSampleCreator(spec, now);
  // Niche and city are set by the team, not the API.
  return { ok: true, creator: { ...creator, id: `sample-${platform}-${handle}`, niche: null, city: null } };
}
