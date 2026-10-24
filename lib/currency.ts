/**
 * One place that decides how money reads. USD (default) renders "$12,000";
 * SAR renders "SAR 12,000" (code prefix, en-US digits). Negatives lead with the
 * minus: "-$1,500", "-SAR 1,500". The currency comes from GLADOS_CURRENCY
 * (see lib/currency-code.ts); unset means USD so nothing changes by default.
 *
 * Third-party USD facts (Anthropic/OpenAI/Apify spend) do NOT use this: they
 * stay USD and say so (see usdCost below).
 */
import { formatCompact } from '@/lib/format-number';
import { currencyCode, currencyPrefix } from '@/lib/currency-code';

export { currencyCode, currencyPrefix };
export type { DisplayCurrency } from '@/lib/currency-code';

export interface MoneyOpts {
  /** Show two decimals ("$1,204.50"). Default whole units. */
  cents?: boolean;
  /** Leading "+" on positive values (P&L figures). */
  plus?: boolean;
  /** Use a true minus sign (U+2212) instead of a hyphen. */
  trueMinus?: boolean;
}

/** Just the symbol/code: "$" or "SAR". */
export function currencySymbol(): string {
  return currencyCode() === 'SAR' ? 'SAR' : '$';
}

export function money(n: number, opts: MoneyOpts = {}): string {
  if (!Number.isFinite(n)) return '—';
  const digits = opts.cents ? 2 : 0;
  const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const zero = Number(body.replace(/,/g, '')) === 0;
  const neg = n < 0 && !zero;
  const sign = neg ? (opts.trueMinus ? '−' : '-') : opts.plus && n > 0 ? '+' : '';
  return `${sign}${currencyPrefix()}${body}`;
}

/** "SAR 29.4K" / "$29.4K"; same compact rules as formatCompact. */
export function moneyCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const body = formatCompact(Math.abs(n));
  return n < 0 && body !== '0' ? `-${currencyPrefix()}${body}` : `${currencyPrefix()}${body}`;
}

/** A real USD-denominated third-party cost (LLM/API spend): always USD, labelled. */
export function usdCost(n: number, cents = true): string {
  const d = cents ? 2 : 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })} USD`;
}
