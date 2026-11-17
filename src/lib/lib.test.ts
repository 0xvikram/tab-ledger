import { describe, expect, it } from "vitest";
import { formatMoney, toMinor } from "./money";
import { balances, customerKey, totalOwed, type Entry } from "./ledger";
import { needsCloud, normaliseEntry, ParseError } from "./parse";

const e = (customer: string, kind: Entry["kind"], rupees: number, at = 1): Entry => ({
  id: `${customer}${at}`,
  customer,
  kind,
  amount: toMinor(rupees),
  items: "",
  said: "",
  source: "typed",
  at,
});

describe("money", () => {
  it("keeps paise exact", () => {
    expect(toMinor(0.1) + toMinor(0.2)).toBe(30);
    expect(toMinor(120)).toBe(12000);
  });
  it("formats rupees the Indian way", () => {
    expect(formatMoney(toMinor(125000), "INR")).toBe("₹1,25,000");
    expect(formatMoney(toMinor(60), "MXN", "es-MX")).toBe("$60");
  });
});

describe("ledger", () => {
  it("nets credit against payments per customer", () => {
    const b = balances([e("Ramesh", "credit", 120, 1), e("Ramesh", "payment", 50, 2), e("Sunita", "credit", 500, 3)]);
    expect(b.map((x) => [x.name, x.owes])).toEqual([
      ["Sunita", 50000],
      ["Ramesh", 7000],
    ]);
  });
  it("treats Gupta ji and Gupta as one customer", () => {
    expect(customerKey("Gupta ji")).toBe(customerKey("gupta"));
    expect(balances([e("Gupta ji", "credit", 100, 1), e("Gupta", "credit", 20, 2)])).toHaveLength(1);
  });
  it("matches honorifics across languages", () => {
    expect(customerKey("Doña Lupe")).toBe(customerKey("lupe"));
    expect(customerKey("Aling Nena")).toBe(customerKey("Nena"));
    expect(customerKey("Mama Achieng")).toBe(customerKey("achieng"));
  });
  it("does not count overpayment as money owed", () => {
    expect(totalOwed([e("A", "payment", 100), e("B", "credit", 40)])).toBe(4000);
  });
});

describe("parse", () => {
  it("accepts good model JSON", () => {
    expect(normaliseEntry('{"customer":"ramesh","kind":"credit","amount":120,"items":"2 kg atta"}')).toEqual({
      customer: "Ramesh",
      kind: "credit",
      amount: 12000,
      items: "2 kg atta",
    });
  });
  it("capitalises names with accents correctly", () => {
    expect(normaliseEntry({ customer: "doña lupe", kind: "credit", amount: 80, items: "" }).customer).toBe("Doña Lupe");
    expect(normaliseEntry({ customer: "DOÑA Lupe", kind: "credit", amount: 80, items: "" }).customer).toBe("DOÑA Lupe");
  });
  it("strips code fences and string amounts", () => {
    expect(normaliseEntry('```json\n{"customer":"Priya","kind":"payment","amount":"₹1,200","items":"x"}\n```').amount).toBe(120000);
  });
  it("rejects missing amount or unknown kind", () => {
    expect(() => normaliseEntry({ customer: "A", kind: "credit", amount: 0, items: "" })).toThrow(ParseError);
    expect(() => normaliseEntry({ customer: "A", kind: "gift", amount: 5, items: "" })).toThrow(ParseError);
  });
  it("routes non-Latin scripts to the cloud", () => {
    expect(needsCloud("रमेश 120 उधार")).toBe(true);
    expect(needsCloud("Ramesh 120 udhaar")).toBe(false);
    expect(needsCloud("Doña Lupe, dos kilos de tortilla, 60 pesos, fiado")).toBe(false);
  });
});

import { normaliseNumbers } from "./numbers";

describe("spoken numbers", () => {
  it.each([
    ["Asha aunty dedh sau de gayi", "Asha aunty 150 de gayi"],
    ["Deepak dhai sau ka saaman le gaya", "Deepak 250 ka saaman le gaya"],
    ["Gupta ji do kilo chawal aur ek litre tel, teen sau bees", "Gupta ji do kilo chawal aur ek litre tel, 320"],
    ["Farhan do hazaar paanch sau diye", "Farhan 2500 diye"],
    ["Ramesh 2 kilo atta 120 udhaar", "Ramesh 2 kilo atta 120 udhaar"],
    ["Meena ek sau pachaas jama", "Meena 150 jama"],
  ])("%s", (said, want) => {
    expect(normaliseNumbers(said)).toBe(want);
  });
});

describe("spoken numbers leave plain English alone", () => {
  it("does not read English 'so' as a hundred", () => {
    expect(normaliseNumbers("Ramesh paid so far 500")).toBe("Ramesh paid so far 500");
  });
});
