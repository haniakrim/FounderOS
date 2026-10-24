'use client';

import { GDotNumber, GTag } from '@/components/g';

/**
 * A GStat whose figure always draws as dots at a fixed size, for values longer than GStat's six-character
 * limit (a whole-currency amount like "SAR 1,621"). null stays an em dash; the source is the title.
 */
export function DotStat({ value, label, source, size = 4 }: { value: string | null; label: string; source: string; size?: 3 | 4 | 5 }) {
  return (
    <span data-g="DotStat" className="g-stat" title={source}>
      <span className="g-stat-num">
        <GDotNumber value={value} size={size} />
      </span>
      <span className="g-stat-label"><GTag>{label}</GTag></span>
    </span>
  );
}
