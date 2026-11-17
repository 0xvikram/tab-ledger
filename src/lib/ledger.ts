import type { Minor } from "./money";

export type EntryKind = "credit" | "payment";
export type Source = "on_device" | "in_cloud" | "typed";

export interface Entry {
  id: string;
  customer: string; // display name as said
  kind: EntryKind; // credit = took goods on credit (khata, fiado, utang, deni), payment = paid back
  amount: Minor;
  items: string;
  said: string; // original words, kept for trust
  source: Source; // which side understood it
  at: number; // ms since epoch
}

export interface CustomerBalance {
  key: string;
  name: string;
  owes: Minor; // positive = customer owes the shop
  lastAt: number;
  entries: number;
}

export function customerKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/(^|\s)(ji|bhai|bhaiya|didi|aunty|uncle|sir|madam|sahab|don|doña|dona|señor|señora|sr|sra|aling|mang|ate|kuya|mama|baba|mzee|mr|mrs|ms)\.?(?=\s|$)/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function balances(entries: Entry[]): CustomerBalance[] {
  const map = new Map<string, CustomerBalance>();
  for (const e of entries) {
    const key = customerKey(e.customer) || e.customer;
    const b = map.get(key) ?? { key, name: e.customer.trim(), owes: 0, lastAt: 0, entries: 0 };
    b.owes += e.kind === "credit" ? e.amount : -e.amount;
    b.entries += 1;
    if (e.at >= b.lastAt) {
      b.lastAt = e.at;
      b.name = e.customer.trim();
    }
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.owes - a.owes || b.lastAt - a.lastAt);
}

export function totalOwed(entries: Entry[]): Minor {
  return balances(entries).reduce((s, b) => s + Math.max(0, b.owes), 0);
}

export function sourceShare(entries: Entry[]): Record<Source, number> {
  const out: Record<Source, number> = { on_device: 0, in_cloud: 0, typed: 0 };
  for (const e of entries) out[e.source] += 1;
  return out;
}
