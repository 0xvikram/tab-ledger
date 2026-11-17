import { toMinor, type Minor } from "./money";
import type { EntryKind } from "./ledger";

// JSON schema shared by the on-device model (responseConstraint) and the cloud model (responseSchema).
export const entrySchema = {
  type: "object",
  properties: {
    customer: { type: "string" },
    kind: { type: "string", enum: ["credit", "payment"] },
    amount: { type: "number" },
    items: { type: "string" },
  },
  required: ["customer", "kind", "amount", "items"],
} as const;

// Per-language words for "credit" and "paid back". Keeping the prompt to one language makes the on-device model
// about twice as fast, because Chrome re-reads the system prompt on every call.
const WORDS: Record<string, { credit: string; payment: string }> = {
  English: { credit: "on credit, on my tab, took, put it on the book", payment: "paid, paid back, gave, settled" },
  Spanish: { credit: "fiado, se llevó, a cuenta, apúntalo", payment: "pagó, abonó, dio, liquidó" },
  Hinglish: { credit: "udhaar, liya, le gaya, khate mein", payment: "jama, diya, de gaya, chuka diya" },
  Swahili: { credit: "deni, amechukua, kwa mkopo", payment: "amelipa, alilipa, ametoa" },
  Tagalog: { credit: "utang, kinuha, ilista", payment: "bayad, nagbayad, binayaran" },
};

export function entrySystem(language: string): string {
  const w = WORDS[language] ?? WORDS.English;
  return `Turn one spoken shop credit-book entry into JSON.
customer: the customer's name as said, with any honorific.
kind: "credit" if they took goods without paying (${w.credit}); "payment" if they paid money back (${w.payment}).
amount: the total money as a plain number. Convert number words to digits.
items: short list of goods in ${language}, or "" for a payment.`;
}
export const ENTRY_SYSTEM = entrySystem("English");

export interface ParsedEntry {
  customer: string;
  kind: EntryKind;
  amount: Minor;
  items: string;
}

// Chrome's on-device model reads a few Latin-script languages; anything in another script goes to the cloud.
const NON_LATIN = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;
export function needsCloud(said: string): boolean {
  return NON_LATIN.test(said);
}

export class ParseError extends Error {}

// Validates model output; never trusts it blindly.
export function normaliseEntry(raw: unknown): ParsedEntry {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      obj = JSON.parse(text);
    } catch {
      throw new ParseError("The answer was not JSON");
    }
  }
  if (!obj || typeof obj !== "object") throw new ParseError("Empty answer");
  const o = obj as Record<string, unknown>;
  const customer = typeof o.customer === "string" ? o.customer.trim() : "";
  if (!customer) throw new ParseError("No customer name heard");
  const kind = o.kind === "payment" ? "payment" : o.kind === "credit" ? "credit" : null;
  if (!kind) throw new ParseError("Could not tell credit from payment");
  const n = typeof o.amount === "string" ? Number(o.amount.replace(/[^\d.]/g, "")) : o.amount;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) throw new ParseError("No amount heard");
  if (n > 10_000_000) throw new ParseError("Amount looks wrong");
  const items = typeof o.items === "string" ? o.items.trim() : "";
  return { customer: titleCase(customer), kind, amount: toMinor(n), items: kind === "payment" ? "" : items };
}

function titleCase(s: string): string {
  return s.replace(/(^|[\s'-])(\p{Ll})/gu, (_m, pre: string, c: string) => pre + c.toUpperCase());
}
