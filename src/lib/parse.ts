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

export const ENTRY_SYSTEM = `You turn one spoken shop credit-book entry into JSON. The shopkeeper may speak English, Spanish, Hindi or Hinglish, Swahili or Tagalog.
customer: the customer's name as said, with any honorific (Doña, Aling, Mama, ji).
kind: "credit" when the customer took goods without paying now (on credit, on my tab, fiado, udhaar, utang, deni, took, le gaya, se llevó, kinuha);
      "payment" when the customer paid money back (paid, pagó, abonó, jama, diya, bayad, nagbayad, amelipa, alilipa).
amount: the total money as a plain number, no currency sign. Convert number words to digits.
items: a short list of the goods in the language that was spoken, or "" for a payment.`;

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
