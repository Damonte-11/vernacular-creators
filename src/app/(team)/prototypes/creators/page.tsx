"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Feed from "./feed";
import Mix from "./mix";
import Signal from "./signal";
import Verdict from "./verdict";

const VARIANTS = [
  { name: "Mix", C: Mix },
  { name: "Feed", C: Feed },
  { name: "Signal", C: Signal },
  { name: "Verdict", C: Verdict },
];

/** Prototype: three directions for the creator side (search → quick look → full report). Sample data only. */
export default function CreatorPrototypes() {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(location.search).get("v") ?? "1", 10);
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
  }, []);

  const move = () => {
    const el = items.current[current];
    if (!el || !highlight.current) return;
    highlight.current.style.width = `${el.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  };
  useLayoutEffect(move);
  useEffect(() => {
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  });

  function setActive(i: number) {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setMountKey((k) => k + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) setActive(n - 1);
      else if (e.key === "ArrowRight") setActive((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") setMountKey((k) => k + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { C } = VARIANTS[current];
  return (
    <>
      <style>{PROTO_CSS}</style>
      <p className="no-print mb-4 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn ring-1 ring-warn/20">
        <b className="font-semibold">Design prototype.</b> Four directions (Mix combines the ones you liked) for finding creators, the quick look and the full
        report, on made-up sample creators. Flip with the picker at the bottom or keys 1–4. Nothing here is saved.
      </p>
      <div key={`${current}-${mountKey}`} className="pb-24">
        <C />
      </div>
      <nav ref={nav} className="proto-picker no-print" aria-label="Prototype variants" data-ready={ready ? "" : undefined}>
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => setActive(i)}
          >
            {v.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setMountKey((k) => k + 1)}>
          ↻
        </button>
      </nav>
    </>
  );
}

const PROTO_CSS = `
.proto-picker{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-picker-highlight{position:absolute;top:4px;left:0;height:28px;border-radius:999px;background:rgba(255,255,255,.12);will-change:transform}
.proto-picker[data-ready] .proto-picker-highlight{transition:transform 250ms cubic-bezier(.23,1,.32,1),width 250ms cubic-bezier(.23,1,.32,1)}
@media (prefers-reduced-motion:reduce){.proto-picker[data-ready] .proto-picker-highlight{transition:none}}
.proto-picker-item{position:relative;display:flex;align-items:center;height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.55);font:inherit;cursor:pointer;transition:color 150ms ease-out}
.proto-picker-item:hover{color:rgba(255,255,255,.85)}
.proto-picker-item:active{transform:scale(.97)}
.proto-picker-item:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.proto-picker-item[data-active]{color:#fff}
.proto-picker-divider{width:1px;height:16px;margin:0 4px;background:rgba(255,255,255,.12)}
.proto-picker-replay{padding:0 10px;font-size:14px}

@keyframes proto-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes proto-drawer{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}
@keyframes proto-fade{from{opacity:0}to{opacity:1}}
@keyframes proto-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes proto-ring{from{stroke-dashoffset:var(--c,200)}}
.proto-rise{animation:proto-rise 260ms cubic-bezier(.23,1,.32,1) both}
.proto-drawer{animation:proto-drawer 240ms cubic-bezier(.23,1,.32,1) both}
.proto-fade{animation:proto-fade 200ms ease-out both}
.proto-grow{transform-origin:left;animation:proto-grow 500ms cubic-bezier(.23,1,.32,1) both}
@media (prefers-reduced-motion:reduce){.proto-rise,.proto-drawer,.proto-fade,.proto-grow{animation:none}}
`;
