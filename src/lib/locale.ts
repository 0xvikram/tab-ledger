// Shops everywhere keep a credit book: khata (India), fiado (Latin America), utang (Philippines), deni (East Africa).
// A shop picks its language and currency once; everything else follows.

export type LangCode = "en" | "es" | "hi" | "sw" | "tl";

export interface ShopLang {
  code: LangCode;
  label: string; // shown in its own language
  speech: string; // BCP-47 tag for speech recognition
  example: string; // placeholder, a real-sounding entry
  credit: string; // local word for credit, shown in hints
  paid: string; // local word for paying back
}

export const LANGS: ShopLang[] = [
  { code: "en", label: "English", speech: "en-US", example: "Maria, 2 loaves of bread and milk, 6, on credit", credit: "on credit", paid: "paid" },
  { code: "es", label: "Español", speech: "es-MX", example: "Doña Lupe, dos kilos de tortilla, 60 pesos, fiado", credit: "fiado", paid: "pagó" },
  { code: "hi", label: "हिंदी / Hinglish", speech: "hi-IN", example: "Ramesh, 2 kilo atta, 120, udhaar", credit: "udhaar", paid: "jama" },
  { code: "sw", label: "Kiswahili", speech: "sw-KE", example: "Mama Achieng, sukari kilo mbili, shilingi 300, deni", credit: "deni", paid: "amelipa" },
  { code: "tl", label: "Tagalog", speech: "fil-PH", example: "Aling Nena, dalawang sardinas, 50 piso, utang", credit: "utang", paid: "bayad" },
];

export interface Currency {
  code: string;
  label: string;
  minor: number; // minor units per major unit
}

export const CURRENCIES: Currency[] = [
  { code: "USD", label: "US dollar", minor: 100 },
  { code: "MXN", label: "Mexican peso", minor: 100 },
  { code: "INR", label: "Indian rupee", minor: 100 },
  { code: "KES", label: "Kenyan shilling", minor: 100 },
  { code: "PHP", label: "Philippine peso", minor: 100 },
  { code: "NGN", label: "Nigerian naira", minor: 100 },
  { code: "BRL", label: "Brazilian real", minor: 100 },
  { code: "EUR", label: "Euro", minor: 100 },
  { code: "GBP", label: "British pound", minor: 100 },
];

export interface Shop {
  lang: LangCode;
  currency: string;
}

const DEFAULT_BY_LANG: Record<LangCode, string> = { en: "USD", es: "MXN", hi: "INR", sw: "KES", tl: "PHP" };

export function guessShop(navLang: string): Shop {
  const l = navLang.toLowerCase();
  const lang: LangCode = l.startsWith("es") ? "es" : l.startsWith("hi") ? "hi" : l.startsWith("sw") ? "sw" : l.startsWith("fil") || l.startsWith("tl") ? "tl" : "en";
  let currency = DEFAULT_BY_LANG[lang];
  if (l.endsWith("-in")) currency = "INR";
  else if (l.endsWith("-gb")) currency = "GBP";
  else if (l.endsWith("-ng")) currency = "NGN";
  else if (l.endsWith("-br")) currency = "BRL";
  else if (l.endsWith("-ke")) currency = "KES";
  else if (l.endsWith("-ph")) currency = "PHP";
  return { lang, currency };
}

export const langOf = (c: LangCode) => LANGS.find((l) => l.code === c) ?? LANGS[0];

const KEY = "tab.shop";
export function loadShop(): Shop | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && LANGS.some((l) => l.code === s.lang) && CURRENCIES.some((c) => c.code === s.currency)) return s;
  } catch {
    /* private mode */
  }
  return null;
}
export function storeShop(s: Shop) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}
