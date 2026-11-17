import type { Entry } from "./ledger";

// A realistic week in a small English-speaking corner shop. Amounts in cents.
const day = 86_400_000;
export function demoSeed(now = Date.now()): Omit<Entry, "id">[] {
  const at = (d: number, h: number) => now - d * day + (h - 12) * 3_600_000;
  const e = (customer: string, kind: Entry["kind"], amount: number, items: string, d: number, h: number, said: string): Omit<Entry, "id"> => ({
    customer, kind, amount, items, said, source: "on_device", at: at(d, h),
  });
  return [
    e("Maria", "credit", 600, "two loaves of bread, a carton of milk", 6, 9, "Maria took two loaves of bread and a carton of milk, six dollars, on credit"),
    e("Joe", "credit", 1850, "rice, cooking oil", 5, 18, "Joe, a bag of rice and cooking oil, eighteen dollars fifty, on credit"),
    e("Mrs Patel", "credit", 900, "eggs, butter", 5, 10, "Mrs Patel took eggs and butter, nine dollars, put it on the book"),
    e("Sam", "credit", 2000, "phone top-up", 4, 16, "Sam took a phone top-up, twenty, on credit"),
    e("Joe", "payment", 1000, "", 3, 11, "Joe paid ten"),
    e("Ana", "credit", 1240, "flour, sugar, tea", 3, 15, "Ana, flour, sugar and tea, twelve forty, on credit"),
    e("Maria", "payment", 600, "", 2, 9, "Maria paid back six"),
    e("Mr Okafor", "credit", 3275, "nappies, baby formula", 2, 19, "Mr Okafor took nappies and baby formula, thirty-two seventy-five, on credit"),
    e("Sam", "credit", 450, "two sodas", 1, 13, "Sam, two sodas, four fifty, on the book"),
    e("Ana", "payment", 500, "", 0, 10, "Ana paid five"),
  ];
}
