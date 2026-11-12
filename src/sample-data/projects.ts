/**
 * Demo mode: made-up Chorus projects built from the sample creators, so every
 * screen has something to show. No real clients, briefs or results.
 */
import { addDays, DEFAULT_COMMENT_CAP, emptyBrief, todayLagos } from "@/lib/projects";
import type { Creator, PostCheck, Project, ProjectCreator, ProjectPost } from "@/lib/types";

/** Small deterministic random, so the sample is the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Share of a post's day-7 views it has after `age` days. */
function grown(age: number): number {
  return age >= 7 ? 1 : age >= 3 ? 0.84 : age >= 1 ? 0.62 : 0.4;
}

function postUrl(c: Creator, code: string): string {
  if (c.platform === "tiktok") return `https://www.tiktok.com/@${c.handle}/video/73${code}`;
  if (c.platform === "youtube") return `https://www.youtube.com/shorts/${code}`;
  return `https://www.instagram.com/${c.handle}/reel/C${code}/`;
}

function makePosts(projectId: string, c: Creator, pc: ProjectCreator, today: string, rand: () => number, late: boolean): ProjectPost[] {
  if (late || !pc.dueDate) return [];
  const posts: ProjectPost[] = [];
  for (let n = 0; n < pc.postsAgreed; n++) {
    const posted = addDays(pc.dueDate, n * 4 + (rand() < 0.25 ? 1 : 0));
    if (posted > today) break;
    const age = Math.round((Date.parse(today) - Date.parse(posted)) / 86_400_000);
    const finalViews = Math.round(c.followers * (0.5 + rand() * 1.2) + 4_000);
    const er = 0.035 + rand() * 0.06;
    const checks: PostCheck[] = [1, 3, 7]
      .filter((d) => d <= age)
      .map((d) => {
        const views = Math.round(finalViews * grown(d));
        const eng = views * er;
        return {
          day: d,
          checkedAt: `${addDays(posted, d)}T09:00:00.000Z`,
          views,
          likes: Math.round(eng * 0.86),
          comments: Math.round(eng * 0.1),
          shares: c.platform === "tiktok" ? Math.round(eng * 0.04) : null,
          source: "auto" as const,
        };
      });
    posts.push({
      id: `${projectId}-${c.handle}-${n}`,
      creatorId: c.id,
      url: postUrl(c, Math.floor(rand() * 1e9).toString(36)),
      platform: c.platform,
      postedDate: posted,
      addedAt: `${posted}T12:00:00.000Z`,
      source: n % 2 ? "sheet" : "app",
      checks,
      problem: null,
    });
  }
  return posts;
}

function build(
  base: Omit<Project, "creators" | "posts" | "documents" | "createdAt" | "commentCap" | "sheetUrl">,
  picks: Creator[],
  opts: { today: string; seed: number; late?: number[]; postsEach?: number },
): Project {
  const rand = seeded(opts.seed);
  const span = Math.round((Date.parse(base.endDate) - Date.parse(base.startDate)) / 86_400_000) - 2;
  const creators: ProjectCreator[] = picks.map((c, i) => ({
    creatorId: c.id,
    dueDate: addDays(base.startDate, Math.floor((i / picks.length) * span)),
    postsAgreed: opts.postsEach ?? 1,
  }));
  const posts = picks.flatMap((c, i) => makePosts(base.id, c, creators[i], opts.today, rand, opts.late?.includes(i) ?? false));
  return {
    ...base,
    createdAt: `${addDays(base.startDate, -7)}T10:00:00.000Z`,
    commentCap: DEFAULT_COMMENT_CAP,
    sheetUrl: null,
    creators,
    posts,
    documents: [
      {
        id: `${base.id}-doc-brief`,
        kind: "brief",
        title: "Campaign brief (sample)",
        url: "https://docs.google.com/presentation/d/sample-brief",
        filePath: null,
        addedAt: `${addDays(base.startDate, -7)}T10:00:00.000Z`,
      },
    ],
  };
}

export function sampleProjects(creators: Creator[], now: number = Date.now()): Project[] {
  const today = todayLagos(now);
  const small = creators.filter((c) => c.followers < 100_000).slice(0, 16);
  const big = creators.filter((c) => c.followers >= 150_000).slice(0, 6);
  const mixed = [...creators.filter((c) => c.followers < 60_000).slice(16, 24), ...creators.filter((c) => c.followers >= 300_000).slice(0, 3)];
  const brief = {
    ...emptyBrief(),
    brand: "Sample Malt",
    product: "New 33cl can",
    keyMessage: "The taste of Sunday, any day.",
    mustSay: ["New can", "Available in stores now"],
    hashtags: ["#SundayAnyDay"],
    dos: ["Show the can in the first 3 seconds", "Film at home with family or friends"],
    donts: ["No other drink brands in shot", "No drinking-and-driving scenes"],
    competitors: ["Other Malt"],
  };
  return [
    build(
      {
        id: "sample-malt-launch",
        name: "Malt can launch (sample)",
        client: "Sample client A",
        chorusType: "seedlings",
        vertical: "Food & drink",
        startDate: addDays(today, -9),
        endDate: addDays(today, 11),
        guarantee: 750_000,
        objective: "awareness",
        brief,
      },
      small,
      { today, seed: 3, late: [3, 7] },
    ),
    build(
      {
        id: "sample-year-end",
        name: "Year-end sale (sample)",
        client: "Sample client B",
        chorusType: "headliners",
        vertical: "Retail",
        startDate: addDays(today, -30),
        endDate: addDays(today, -17),
        guarantee: 4_000_000,
        objective: "conversion",
        brief: { ...emptyBrief(), brand: "Sample Store", keyMessage: "Everything up to 50% off until 31 December." },
      },
      big,
      { today, seed: 11, postsEach: 2 },
    ),
    build(
      {
        id: "sample-app-signups",
        name: "App sign-ups push (sample)",
        client: "Sample client C",
        chorusType: "salad",
        vertical: "Fintech",
        startDate: addDays(today, 9),
        endDate: addDays(today, 36),
        guarantee: 2_500_000,
        objective: "consideration",
        brief: { ...emptyBrief(), brand: "Sample Pay" },
      },
      mixed,
      { today, seed: 7 },
    ),
  ];
}

/** Made-up comments for the demo report: praise, pidgin, questions, buying signals, a competitor, spam. */
export function sampleComments(p: Project): import("@/lib/campaign-report").RawComment[] {
  const brand = p.brief.brand || "the brand";
  const product = p.brief.product || "this";
  const lines = [
    `This ${product} na correct thing o 😍`,
    `Where can I get ${brand} in Lekki?`,
    `How much is the new can?`,
    `First time I'm hearing of ${brand}, looks nice`,
    `@tunde_x you need to see this 😂`,
    `Your skits always burst my brain 🔥🔥`,
    `${brand} better pass ${p.brief.competitors[0] ?? "the other one"} any day`,
    `Too expensive for me abeg`,
    `I just bought two, the taste is sweet`,
    `🔥🔥🔥`,
    `Follow me back, check my page for promo`,
    `Omo the outfit is everything`,
    `Is it available in Abuja?`,
    `Not a fan of the taste honestly`,
    `Love this! ${p.brief.hashtags[0] ?? ""}`,
  ];
  const out: import("@/lib/campaign-report").RawComment[] = [];
  const posts = p.posts.filter((x) => x.creatorId);
  posts.forEach((post, k) => {
    for (let i = 0; i < 12; i++)
      out.push({ postId: post.id, text: lines[(i * 7 + k * 3) % lines.length], likes: (i * 13 + k * 7) % 90, replies: i % 4 === 0 ? 2 : 0 });
  });
  return out;
}
