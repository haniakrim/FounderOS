/**
 * The display currency, read from GLADOS_CURRENCY (inlined for the browser by
 * next.config.mjs). Kept import-free so lib/format-number.ts and lib/currency.ts
 * can both depend on it. Read on every call so a test can override the env.
 */
export type DisplayCurrency = 'USD' | 'SAR';

export function currencyCode(): DisplayCurrency {
  const raw = (process.env.GLADOS_CURRENCY ?? '').trim().toUpperCase();
  return raw === 'SAR' ? 'SAR' : 'USD';
}

/** "$" for USD, "SAR " (with its trailing space) for SAR. */
export function currencyPrefix(): string {
  return currencyCode() === 'SAR' ? 'SAR ' : '$';
}
