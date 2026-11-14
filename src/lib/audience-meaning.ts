import type { AudienceSignals } from "./types";

/** The same numbers, read for a brand: what to do with this creator's audience. Plain rules, no AI. */
export function meaning(a: AudienceSignals): string[] {
  const out: string[] = [];
  const lang = a.languages[0];
  if (lang)
    out.push(
      lang.share >= 60
        ? `Most of them comment in ${lang.label} (${lang.share}%). Brief the creator to speak it, not to switch.`
        : `Their audience mixes languages; ${lang.label} leads at ${lang.share}%.`,
    );
  if (a.sentiment.negative >= 20) out.push(`${a.sentiment.negative}% of comments are negative. Read them before booking, and keep the brand out of any fight.`);
  else if (a.sentiment.positive >= 60) out.push(`The room is warm: ${a.sentiment.positive}% positive. A safe place for a product moment.`);
  else out.push(`Mostly neutral (${a.sentiment.neutral}%). They watch more than they cheer, so the hook has to work hard.`);
  if (a.buyingShare >= 5) out.push(`${a.buyingShare}% ask where to buy, what it costs or how to get it. Good for a sales push with a clear call to action.`);
  else out.push(`Few buying signals (${a.buyingShare}%). Better for awareness than for sales.`);
  if (a.questionShare >= 10) out.push(`${a.questionShare}% ask questions, so people listen to them. Reviews and how-tos fit.`);
  if (a.spamShare > 15) out.push(`${a.spamShare}% look like bots or promos. Expect some of the numbers to be hollow.`);
  else if (a.spamShare <= 5) out.push(`Real people: only ${a.spamShare}% look like bots.`);
  if (a.themes.length) out.push(`Talk to what they already talk about: ${a.themes.slice(0, 3).join(", ")}.`);
  return out;
}
