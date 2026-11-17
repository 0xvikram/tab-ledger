// Drafts a short, polite payment reminder the shopkeeper sends themselves. Nothing is ever sent by Tab.
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, ThinkingLevel, type GenerativeModel } from "firebase/ai";
import { firebaseApp, runsOnDevice } from "./ai";
import type { Entry, Source } from "./ledger";
import { langOf, type LangCode } from "./locale";

const LANG_NAME: Record<LangCode, string> = { en: "English", es: "Spanish", hi: "Hinglish (Hindi in Latin letters)", sw: "Swahili", tl: "Tagalog" };

export function reminderPrompt(p: { name: string; owes: string; items: string[]; days: number; lang: LangCode; shop?: string }): string {
  return `Write one short, warm WhatsApp message from a neighbourhood shopkeeper to a regular customer about money they owe.
Language: ${LANG_NAME[p.lang]}. Customer: ${p.name}. Amount owed: ${p.owes}. Oldest unpaid item ${p.days} days ago${p.items.length ? `; recent items: ${p.items.slice(0, 3).join(", ")}` : ""}.
Rules: 2 sentences at most, friendly and respectful, no threats, no interest or penalties, no emoji, mention the amount once, offer to pay when convenient. Reply with the message text only.`;
}

const cache = new Map<string, GenerativeModel>();
function model(lang: LangCode): GenerativeModel {
  const key = runsOnDevice(lang) ? lang : "cloud";
  let m = cache.get(key);
  if (m) return m;
  const ai = getAI(firebaseApp(), { backend: new GoogleAIBackend() });
  const inCloudParams = { model: "gemini-3.5-flash-lite", generationConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } };
  m = runsOnDevice(lang)
    ? getGenerativeModel(ai, {
        mode: InferenceMode.PREFER_ON_DEVICE,
        inCloudParams,
        onDeviceParams: {
          createOptions: {
            expectedInputs: [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: [lang === "es" ? "es" : "en"] }],
          },
        },
      })
    : getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams });
  cache.set(key, m);
  return m;
}

export function cleanReminder(text: string): string {
  return text
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+\n/g, "\n")
    .slice(0, 600);
}

export async function draftReminder(p: Parameters<typeof reminderPrompt>[0]): Promise<{ text: string; source: Source; ms: number }> {
  const t = performance.now();
  const res = await model(p.lang).generateContent(reminderPrompt(p));
  const text = cleanReminder(res.response.text());
  if (!text) throw new Error("empty");
  return { text, source: res.response.inferenceSource === "on_device" ? "on_device" : "in_cloud", ms: Math.round(performance.now() - t) };
}

// Days since the oldest credit that is still unpaid, assuming payments clear the oldest credit first.
export function oldestUnpaidDays(entries: Entry[], now = Date.now()): number {
  const credits = entries.filter((e) => e.kind === "credit").sort((a, b) => a.at - b.at);
  let paid = entries.filter((e) => e.kind === "payment").reduce((s, e) => s + e.amount, 0);
  for (const c of credits) {
    if (paid >= c.amount) {
      paid -= c.amount;
      continue;
    }
    return Math.max(0, Math.floor((now - c.at) / 86_400_000));
  }
  return 0;
}

export interface Week {
  given: number;
  collected: number;
  newCustomers: number;
}

export function thisWeek(entries: Entry[], now = Date.now()): Week {
  const from = now - 7 * 86_400_000;
  const firstSeen = new Map<string, number>();
  for (const e of entries) {
    const k = e.customer.toLowerCase();
    firstSeen.set(k, Math.min(firstSeen.get(k) ?? Infinity, e.at));
  }
  const recent = entries.filter((e) => e.at >= from);
  return {
    given: recent.filter((e) => e.kind === "credit").reduce((s, e) => s + e.amount, 0),
    collected: recent.filter((e) => e.kind === "payment").reduce((s, e) => s + e.amount, 0),
    newCustomers: [...firstSeen.values()].filter((t) => t >= from).length,
  };
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const creditWord = (lang: LangCode) => langOf(lang).credit;

// One-line English gloss so anyone (judges, the owner's family) can read a non-English entry or reminder.
let translator: GenerativeModel | null = null;
const glossCache = new Map<string, string>();
export async function toEnglish(text: string): Promise<string> {
  const hit = glossCache.get(text);
  if (hit) return hit;
  if (!translator) {
    const ai = getAI(firebaseApp(), { backend: new GoogleAIBackend() });
    translator = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: { model: "gemini-3.5-flash-lite", generationConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } },
    });
  }
  const res = await translator.generateContent(`Translate into plain English. Keep names and amounts exactly. Reply with the translation only.\n\n${text}`);
  const out = cleanReminder(res.response.text());
  glossCache.set(text, out);
  return out;
}
