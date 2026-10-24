'use client';

import { useEffect, useRef, useState } from 'react';
import { money } from '@/lib/currency';
import { GDotNumber, type DotSize } from '@/components/g';

/** One frame of a count: ease-out cubic from `from` to `to` at progress t
 *  (0..1). Intermediate frames are whole numbers; the last lands exactly. */
export function countFrame(from: number, to: number, t: number): number {
  if (t >= 1) return to;
  if (t <= 0) return from;
  const eased = 1 - Math.pow(1 - t, 3);
  return Math.round(from + (to - from) * eased);
}

/** 900ms ease-out count-in for the pulse tiles and the slab numerals. The
 *  first paint counts up from zero; after that a new target (a polled board
 *  ticking over) counts from the number already on screen, so a live value
 *  never drops to zero and climbs again. The final frame lands on the exact
 *  target (cents included); reduced motion lands instantly. */
export function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  const shown = useRef(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = target;
      setValue(target);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    const step = (now: number) => {
      const next = countFrame(from, target, (now - start) / ms);
      shown.current = next;
      setValue(next);
      if (next !== target) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return value;
}

/** How a counted number reads once it lands. Formatters live here, not in
 *  props, because a server page cannot hand a function to a client island. */
export type CountKind = 'int' | 'usd' | 'usdCents' | 'followers' | 'tokens' | 'pct';

const FORMAT: Record<CountKind, (n: number) => string> = {
  int: (n) => Math.round(n).toLocaleString('en-US'),
  usd: (n) => money(n),
  usdCents: (n) => money(n, { cents: true }),
  followers: (n) => Math.round(n).toLocaleString('en-US'),
  // 68.2M / 1.5k, the way /usage prints token burn (lib/usage.ts fmtTokens)
  tokens: (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n))),
  pct: (n) => `${Math.round(n)}%`,
};

export function formatCount(kind: CountKind, n: number): string {
  return FORMAT[kind](n);
}

export function CountUp({ value, kind = 'int' }: { value: number; kind?: CountKind }) {
  return <>{FORMAT[kind](useCountUp(value))}</>;
}

/** The final value of a count, drawn as dot-matrix numerals (no count-in: the
 *  dots read from the exact formatted target). null stays an em dash. */
export function DotCount({ value, kind = 'int', size = 5, tone = 'ink', label, title }: { value: number | null; kind?: CountKind; size?: DotSize | 'auto'; tone?: 'ink' | 'on-hero' | 'muted'; label?: string; title?: string }) {
  const text = value == null ? null : FORMAT[kind](value);
  return <GDotNumber value={text} size={size} max={5} tone={tone} label={label} title={title} />;
}
