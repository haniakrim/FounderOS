import { afterEach, describe, expect, it } from 'vitest';
import { currencyCode, currencySymbol, money, moneyCompact, usdCost } from '@/lib/currency';
import { formatUsdCompact } from '@/lib/format-number';
import { usd, usdCompact, signedUsd } from '@/lib/trading-model';
import { positionSizes } from '@/lib/trading-view';

const prev = process.env.GLADOS_CURRENCY;
afterEach(() => {
  if (prev === undefined) delete process.env.GLADOS_CURRENCY;
  else process.env.GLADOS_CURRENCY = prev;
});

describe('currency (default USD)', () => {
  it('keeps dollar output when unset', () => {
    delete process.env.GLADOS_CURRENCY;
    expect(currencyCode()).toBe('USD');
    expect(currencySymbol()).toBe('$');
    expect(money(12000)).toBe('$12,000');
    expect(money(-1500)).toBe('-$1,500');
    expect(money(1204.5, { cents: true })).toBe('$1,204.50');
    expect(moneyCompact(29_412)).toBe('$29.4K');
    expect(formatUsdCompact(-1500)).toBe('-$1,500');
    expect(usd(11290)).toBe('$11,290');
    expect(usdCompact(12500)).toBe('$12.5k');
  });
  it('unknown codes fall back to USD', () => {
    process.env.GLADOS_CURRENCY = 'EUR';
    expect(money(5)).toBe('$5');
  });
});

describe('currency (SAR)', () => {
  it('formats with the code prefix', () => {
    process.env.GLADOS_CURRENCY = 'SAR';
    expect(currencyCode()).toBe('SAR');
    expect(currencySymbol()).toBe('SAR');
    expect(money(12000)).toBe('SAR 12,000');
    expect(money(-1500)).toBe('-SAR 1,500');
    expect(money(0)).toBe('SAR 0');
    expect(money(1204.5, { cents: true })).toBe('SAR 1,204.50');
    expect(money(142, { plus: true })).toBe('+SAR 142');
    expect(moneyCompact(29_412)).toBe('SAR 29.4K');
    expect(moneyCompact(-1500)).toBe('-SAR 1,500');
    expect(formatUsdCompact(631_000)).toBe('SAR 631K');
    expect(usd(11290, true)).toBe('SAR 11,290.00');
    expect(usdCompact(980)).toBe('SAR 980');
    expect(usdCompact(12500)).toBe('SAR 12.5k');
    expect(signedUsd(-8.15)).toBe('−SAR 8.15');
    expect(positionSizes([]).map((b) => b.label)).toEqual(['<SAR 50', 'SAR 50-250', 'SAR 250-1k', 'SAR 1k+']);
  });
  it('third-party API cost stays USD', () => {
    process.env.GLADOS_CURRENCY = 'SAR';
    expect(usdCost(1.5)).toBe('$1.50 USD');
  });
});
