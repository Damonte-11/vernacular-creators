import { formatNumber } from "@/lib/format";
import { cx } from "./ui";

/** The website's brand colours, in the order they hand out to channels. */
const COLOURS = ["#f75115", "#16cdeb", "#9a62f7", "#ffc21c", "#0b5edd", "#0aa021"];

/**
 * Where something came from, as pills that each carry their share, over one split bar.
 * From the "Move it" channel pills on the Vernacular website.
 */
export function SharePills({ items, unit = "views", className }: { items: { label: string; value: number }[]; unit?: string; className?: string }) {
  const total = items.reduce((a, x) => a + Math.max(0, x.value), 0);
  if (!total) return null;
  const rows = items
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((x, i) => ({ ...x, colour: COLOURS[i % COLOURS.length], share: Math.round((x.value / total) * 100) }));
  // One channel is 100%, which says nothing.
  if (rows.length < 2) return null;
  return (
    <div className={className}>
      <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full" aria-hidden>
        {rows.map((x) => (
          <span
            key={x.label}
            className="cr-grow h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(x.value / total) * 100}%`, background: x.colour }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {rows.map((x) => (
          <li
            key={x.label}
            className={cx("inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold")}
            style={{ background: `color-mix(in srgb, ${x.colour} 13%, transparent)` }}
            title={`${formatNumber(x.value)} ${unit}`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: x.colour }} aria-hidden />
            {x.label}
            <span className="tabular-nums text-ink-2">{x.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
