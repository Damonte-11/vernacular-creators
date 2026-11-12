/**
 * The end-of-campaign report: the numbers (always free), the brief check,
 * the rebook list, and what the comments say. Comment labels come from AI
 * when it's available, or from the plain rules here. No network calls.
 */
import { CHECK_DAYS, creatorState, daysBetween, postNumbers, postsBy, projectTotals, type ProjectTotals } from "./projects";
import type { CampaignObjective, CreatorAnalysis, Project, ProjectBrief, ProjectPost } from "./types";

/* ── Comments ────────────────────────────────────────────────── */

export type CommentAbout = "brand" | "creator" | "other" | "spam";
export type Sentiment = "positive" | "neutral" | "negative";
export type Signal = "question" | "buying" | "first_time" | "comparison" | "message_pickup" | "objection" | "tag_friend";
export type Language = "english" | "pidgin" | "yoruba" | "igbo" | "hausa" | "other";

export const SIGNALS: { id: Signal; label: string }[] = [
  { id: "message_pickup", label: "Repeats the message or product" },
  { id: "first_time", label: "Hearing about it for the first time" },
  { id: "tag_friend", label: "Tags a friend" },
  { id: "question", label: "Asks a question" },
  { id: "comparison", label: "Compares with a competitor" },
  { id: "objection", label: "Doubt or objection" },
  { id: "buying", label: "Buying signal" },
];

/** Which signals lead the report for each objective. */
export const OBJECTIVE_SIGNALS: Record<CampaignObjective, Signal[]> = {
  awareness: ["message_pickup", "first_time", "tag_friend"],
  consideration: ["question", "comparison", "objection"],
  conversion: ["buying", "question", "objection"],
};

export interface RawComment {
  /** Project post it was left on, when known. */
  postId: string | null;
  text: string;
  likes: number;
  replies: number;
}

export interface CommentLabel {
  about: CommentAbout;
  sentiment: Sentiment;
  signals: Signal[];
  language: Language;
}

const POSITIVE =
  /\b(love|loving|nice|great|amazing|beautiful|sweet|best|fire|lit|wow|cool|good|perfect|fine|correct|sabi|enjoy|yummy|delicious|can't wait|cant wait|need this|want this|i like)\b|🔥|😍|❤|♥|💯|👏|🙌|😋|🥰|💖|💕|✨/i;
const NEGATIVE =
  /\b(hate|bad|worst|scam|fake|nonsense|rubbish|trash|disgusting|boring|overrated|expensive|wack|poor|terrible|awful|no be am|e no good|i no like)\b|👎|🤮|😡|😒|🙄/i;
const PIDGIN = /\b(dey|una|wetin|abeg|sha|oya|wahala|abi|sef|na im|no be|e don|omo|chai|o\b|joor|jare|wan|dis|dat|naim|sabi|gbam)\b/i;
const YORUBA = /\b(e ku|bawo|ẹ|ṣe|mo fe|jọ|ọ|o ti|e se|olorun|emi)\b/i;
const IGBO = /\b(kedu|nne|nna|biko|chineke|ndewo|ọ dị|imela)\b/i;
const HAUSA = /\b(sannu|nagode|yaya|kai|wallahi|ina kwana)\b/i;
const BUYING =
  /\b(where (can|do) i (get|buy)|how much|price|link\??$|order(ed)?|buy(ing)?|purchase|available in|deliver|dm me|i just got|bought|in stock|cost)\b/i;
const QUESTION = /\?|\b(how|where|when|which|what|is it|can i|does it|do they)\b/i;
const FIRST_TIME = /\b(first time|never (heard|seen|knew)|what is this|what's this|wetin be this|didn't know|did not know|new to me)\b/i;
const OBJECTION = /\b(too expensive|expensive|not available|no dey|scam|fake|don't trust|dont trust|halal|side effect|doesn't work|does not work|not worth)\b/i;

function words(s: string): string {
  return s.toLowerCase().replace(/[#@]/g, " ").replace(/\s+/g, " ").trim();
}

/** Brief words worth spotting in comments: brand, product, hashtags, must-says, the key message's main words. */
export function briefTerms(b: ProjectBrief): string[] {
  const out = new Set<string>();
  for (const t of [b.brand, b.product, ...b.hashtags, ...b.mustSay]) {
    const w = words(t);
    if (w.length >= 3) out.add(w);
  }
  for (const w of words(b.keyMessage).split(" ")) if (w.length >= 6) out.add(w);
  return [...out];
}

/** Plain-rules reading of one comment: used without AI, and to fill in when AI is unavailable. */
export function ruleLabel(text: string, brief: ProjectBrief): CommentLabel {
  const t = text.trim();
  const lower = words(t);
  const letters = t.replace(/[^\p{L}]/gu, "");
  const terms = briefTerms(brief);
  const competitors = brief.competitors.map(words).filter((c) => c.length >= 3);
  const spam =
    (letters.length === 0 && t.length > 0 && !POSITIVE.test(t) && !NEGATIVE.test(t)) ||
    /https?:\/\/|follow (me|back)|check my (page|bio)|promo|dm for/i.test(t);
  const aboutBrand = terms.some((term) => lower.includes(term)) || competitors.some((c) => lower.includes(c));
  const signals: Signal[] = [];
  if (terms.some((term) => lower.includes(term))) signals.push("message_pickup");
  if (FIRST_TIME.test(t)) signals.push("first_time");
  if (/@[\w.]{2,}/.test(t)) signals.push("tag_friend");
  if (QUESTION.test(t)) signals.push("question");
  if (competitors.some((c) => lower.includes(c))) signals.push("comparison");
  if (OBJECTION.test(t)) signals.push("objection");
  if (BUYING.test(t)) signals.push("buying");
  const pos = POSITIVE.test(t);
  const neg = NEGATIVE.test(t);
  return {
    about: spam ? "spam" : aboutBrand || signals.includes("buying") ? "brand" : letters.length < 2 && !pos ? "other" : "creator",
    sentiment: pos && !neg ? "positive" : neg && !pos ? "negative" : "neutral",
    signals: spam ? [] : signals,
    language: PIDGIN.test(t) ? "pidgin" : YORUBA.test(t) ? "yoruba" : IGBO.test(t) ? "igbo" : HAUSA.test(t) ? "hausa" : /[a-z]/i.test(t) ? "english" : "other",
  };
}

export interface CommentStats {
  read: number;
  about: Record<CommentAbout, number>;
  /** Sentiment of comments about the brand or product only. */
  brand: Record<Sentiment, number>;
  /** Sentiment of every real comment (brand, creator or other; not spam). */
  overall: Record<Sentiment, number>;
  signals: Record<Signal, number>;
  languages: Record<Language, number>;
  /** Comments that started a conversation (have replies). */
  withReplies: number;
}

export function emptyStats(): CommentStats {
  return {
    read: 0,
    about: { brand: 0, creator: 0, other: 0, spam: 0 },
    brand: { positive: 0, neutral: 0, negative: 0 },
    overall: { positive: 0, neutral: 0, negative: 0 },
    signals: { question: 0, buying: 0, first_time: 0, comparison: 0, message_pickup: 0, objection: 0, tag_friend: 0 },
    languages: { english: 0, pidgin: 0, yoruba: 0, igbo: 0, hausa: 0, other: 0 },
    withReplies: 0,
  };
}

export function addToStats(s: CommentStats, c: RawComment, l: CommentLabel): void {
  s.read++;
  s.about[l.about]++;
  if (l.about === "spam") return;
  s.overall[l.sentiment]++;
  if (l.about === "brand") s.brand[l.sentiment]++;
  for (const sig of new Set(l.signals)) s.signals[sig]++;
  s.languages[l.language]++;
  if (c.replies > 0) s.withReplies++;
}

export interface Quote {
  text: string;
  likes: number;
  postId: string | null;
}

/** The comments worth quoting: most-liked positive, negative and questions about the brand. */
export function pickQuotes(comments: RawComment[], labels: CommentLabel[], n = 4): { positive: Quote[]; negative: Quote[]; questions: Quote[] } {
  const rows = comments.map((c, i) => ({ c, l: labels[i] })).filter((x) => x.l && x.l.about !== "spam" && x.c.text.trim().length >= 8);
  // The same words left many times count once.
  const top = (f: (x: (typeof rows)[number]) => boolean) => {
    const seen = new Set<string>();
    return rows
      .filter(f)
      .sort((a, b) => b.c.likes - a.c.likes)
      .filter((x) => {
        const k = x.c.text.trim().toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, n)
      .map((x) => ({ text: x.c.text.slice(0, 280), likes: x.c.likes, postId: x.c.postId }));
  };
  return {
    positive: [...top((x) => x.l.sentiment === "positive" && x.l.about === "brand"), ...top((x) => x.l.sentiment === "positive" && x.l.about !== "brand")]
      .filter((q, i, list) => list.findIndex((o) => o.text === q.text) === i)
      .slice(0, n),
    negative: top((x) => x.l.sentiment === "negative"),
    questions: top((x) => x.l.signals.includes("question") || x.l.signals.includes("objection")),
  };
}

/* ── Numbers ─────────────────────────────────────────────────── */

export interface CreatorRow {
  creatorId: string;
  name: string;
  handle: string;
  platform: string;
  posts: number;
  postsAgreed: number;
  views: number | null;
  engagements: number | null;
  er: number | null;
  /** Average campaign views per post against their usual views per post (1.0 = as usual). */
  vsUsual: number | null;
  /** Posted on or within a day of the due date. */
  onTime: boolean | null;
  /** 0–100, for the rebook list: delivery against usual, engagement and reliability. */
  rebookScore: number;
}

export interface BriefCheck {
  item: string;
  kind: "must-say" | "hashtag";
  /** Posts whose caption includes it. */
  found: number;
  /** Posts with a caption to check. */
  checked: number;
}

export interface PostRow {
  postId: string;
  creatorId: string | null;
  url: string;
  views: number | null;
  engagements: number | null;
  er: number | null;
}

export interface NumbersReport {
  totals: ProjectTotals;
  creators: CreatorRow[];
  topPosts: PostRow[];
  weakPosts: PostRow[];
  briefChecks: BriefCheck[];
  /** Posts whose caption we have, for the brief check. */
  captions: number;
  onTimeShare: number | null;
}

export function numbersReport(p: Project, analyses: Map<string, CreatorAnalysis>, today: string): NumbersReport {
  const totals = projectTotals(p, today);
  const creators: CreatorRow[] = p.creators.map((pc) => {
    const a = analyses.get(pc.creatorId);
    const posts = postsBy(p, pc.creatorId);
    const nums = posts.map(postNumbers);
    const views = nums.filter((n) => n.views !== null).reduce((s, n) => s + (n.views ?? 0), 0);
    const viewed = nums.filter((n) => n.views !== null).length;
    const eng = nums.filter((n) => n.engagements !== null).reduce((s, n) => s + (n.engagements ?? 0), 0);
    const engViews = nums.filter((n) => n.views !== null && n.engagements !== null).reduce((s, n) => s + (n.views ?? 0), 0);
    const usual = a?.metrics.avgViews ?? null;
    const vsUsual = usual && viewed ? views / viewed / usual : null;
    const first = posts
      .map((x) => x.postedDate)
      .filter((d): d is string => !!d)
      .sort()[0];
    const onTime = !pc.dueDate ? null : first ? daysBetween(pc.dueDate, first) <= 1 : creatorState(p, pc, today) === "late" ? false : null;
    const er = engViews ? eng / engViews : null;
    const rebookScore = Math.round(
      Math.min(1.5, vsUsual ?? 0.7) * 40 + (Math.min(0.15, er ?? 0) / 0.15) * 40 + (onTime === false ? 0 : 20) * (posts.length >= pc.postsAgreed ? 1 : 0.5),
    );
    return {
      creatorId: pc.creatorId,
      name: a?.creator.name ?? "Unknown",
      handle: a?.creator.handle ?? "",
      platform: a?.creator.platform ?? "",
      posts: posts.length,
      postsAgreed: pc.postsAgreed,
      views: viewed ? views : null,
      engagements: nums.some((n) => n.engagements !== null) ? eng : null,
      er,
      vsUsual,
      onTime,
      rebookScore: Math.max(0, Math.min(100, rebookScore)),
    };
  });
  const postRows: PostRow[] = p.posts
    .map((x) => ({ x, n: postNumbers(x) }))
    .filter(({ n }) => n.views !== null)
    .map(({ x, n }) => ({ postId: x.id, creatorId: x.creatorId, url: x.url, views: n.views, engagements: n.engagements, er: n.er }));
  const byViews = [...postRows].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const withCaption = p.posts.filter((x) => x.caption && x.caption.trim());
  const checkItem = (item: string, kind: BriefCheck["kind"]): BriefCheck => {
    const needle = words(item.replace(/^#/, kind === "hashtag" ? "#" : ""));
    const found = withCaption.filter((x) => words(x.caption!).includes(needle.replace(/^#/, ""))).length;
    return { item, kind, found, checked: withCaption.length };
  };
  const timed = creators.filter((c) => c.onTime !== null);
  return {
    totals,
    creators: creators.sort((a, b) => b.rebookScore - a.rebookScore),
    topPosts: byViews.slice(0, 3),
    weakPosts: byViews.length > 3 ? byViews.slice(-3).reverse() : [],
    briefChecks: [...p.brief.mustSay.map((m) => checkItem(m, "must-say")), ...p.brief.hashtags.map((h) => checkItem(h, "hashtag"))],
    captions: withCaption.length,
    onTimeShare: timed.length ? timed.filter((c) => c.onTime).length / timed.length : null,
  };
}

/* ── The saved report ────────────────────────────────────────── */

export interface ReportSections {
  summary: string;
  worked: string;
  didnt: string;
  audience: string;
  next: string;
}

export const SECTION_TITLES: { key: keyof ReportSections; title: string }[] = [
  { key: "summary", title: "Summary" },
  { key: "worked", title: "What worked" },
  { key: "didnt", title: "What didn't" },
  { key: "audience", title: "What the audience said" },
  { key: "next", title: "Recommendations" },
];

export interface CampaignReport {
  generatedAt: string;
  /** Who read the comments and wrote the draft. */
  writtenBy: "ai" | "rules";
  aiName?: string | null;
  commentsRead: number;
  /** Posts whose comments were read, by platform. */
  sources: { platform: string; posts: number; comments: number; note?: string }[];
  stats: CommentStats;
  byPost: Record<string, CommentStats>;
  quotes: { positive: Quote[]; negative: Quote[]; questions: Quote[] };
  /** The commonest questions and objections, in a few words each. */
  themes: string[];
  sections: ReportSections;
  notes: string[];
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const fmt = (n: number | null) => (n === null ? "—" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n));

/** A plain draft of the written sections from the numbers alone, for when AI isn't available. */
export function templateSections(p: Project, n: NumbersReport, stats: CommentStats): ReportSections {
  const t = n.totals;
  const g = p.guarantee;
  const best = n.creators.filter((c) => c.views !== null).sort((a, b) => (b.vsUsual ?? 0) - (a.vsUsual ?? 0));
  const real = stats.read - stats.about.spam;
  const brandReal = stats.brand.positive + stats.brand.neutral + stats.brand.negative;
  const lead = OBJECTIVE_SIGNALS[p.objective];
  return {
    summary: [
      g
        ? `The campaign ${t.views >= g ? "met" : "did not meet"} its views guarantee: ${fmt(t.views)} views against ${fmt(g)} promised.`
        : `The campaign reached ${fmt(t.views)} views.`,
      `${t.posts} of ${t.postsAgreed} agreed posts went up from ${t.creators} creators, with ${fmt(t.engagements)} engagements (${t.erByViews === null ? "—" : `${(t.erByViews * 100).toFixed(1)}%`} by views).`,
    ].join(" "),
    worked: best.length
      ? `Strongest against their usual: ${best
          .slice(0, 3)
          .map((c) => `${c.name} (${c.vsUsual ? `${c.vsUsual.toFixed(1)}× usual views` : fmt(c.views)})`)
          .join(", ")}.`
      : "Not enough numbers yet.",
    didnt: [
      best.length > 3
        ? `Below their usual: ${
            best
              .slice(-3)
              .filter((c) => (c.vsUsual ?? 1) < 0.8)
              .map((c) => c.name)
              .join(", ") || "nobody fell far short"
          }.`
        : "",
      n.onTimeShare !== null && n.onTimeShare < 1 ? `${Math.round((1 - n.onTimeShare) * 100)}% of creators posted late.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    audience: real
      ? `${stats.read} comments read. Of real comments, ${pct(stats.about.brand, real)} were about the brand or product; of those, ${pct(stats.brand.positive, brandReal)} positive and ${pct(stats.brand.negative, brandReal)} negative. ${lead
          .map((s) => `${SIGNALS.find((x) => x.id === s)!.label}: ${stats.signals[s]}`)
          .join("; ")}. ${pct(stats.about.spam, stats.read)} looked like spam or bots.`
      : "No comments were read.",
    next: best.length
      ? `Rebook first: ${n.creators
          .slice(0, 3)
          .map((c) => c.name)
          .join(", ")}.`
      : "",
  };
}

/** Which posts to read comments from: those with a creator and a link, at least a day old. */
export function postsForComments(p: Project, today: string): ProjectPost[] {
  return p.posts.filter((x) => x.creatorId && x.platform && (!x.postedDate || daysBetween(x.postedDate, today) >= Math.min(...CHECK_DAYS)));
}
