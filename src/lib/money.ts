// All money is stored as integer minor units (cents, paise, centavos) so totals never drift.

export type Minor = number;

export function toMinor(major: number): Minor {
  if (!Number.isFinite(major)) throw new Error("Amount is not a number");
  return Math.round(major * 100);
}

const cache = new Map<string, Intl.NumberFormat>();
export function formatMoney(m: Minor, currency = "INR", locale?: string): string {
  const key = `${currency}|${locale ?? ""}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale ?? (currency === "INR" ? "en-IN" : undefined), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    cache.set(key, f);
  }
  return f.format(m / 100);
}
