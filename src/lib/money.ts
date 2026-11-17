// All money is stored as integer minor units (cents, paise, centavos) so totals never drift.

export type Minor = number;

export function toMinor(major: number): Minor {
  if (!Number.isFinite(major)) throw new Error("Amount is not a number");
  return Math.round(major * 100);
}

const cache = new Map<string, Intl.NumberFormat>();
// Whole amounts show no decimals ($6); anything with cents shows two ($43.50, never $43.5).
export function formatMoney(m: Minor, currency = "INR", locale?: string): string {
  const cents = m % 100 !== 0;
  const key = `${currency}|${locale ?? ""}|${cents}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale ?? (currency === "INR" ? "en-IN" : undefined), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: 2,
    });
    cache.set(key, f);
  }
  return f.format(m / 100);
}
