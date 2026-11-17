import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema, ThinkingLevel, type GenerativeModel } from "firebase/ai";
import { entrySystem, entrySchema, needsCloud, normaliseEntry, type ParsedEntry } from "./parse";
import { normaliseNumbers } from "./numbers";
import type { Source } from "./ledger";
import type { LangCode } from "./locale";

// Firebase web config is public by design; it is read from VITE_ env vars (see .env.example).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  if (app) return app;
  app = initializeApp(config);
  if (import.meta.env.DEV) {
    // Debug token for local runs; the token itself is registered in the console, never committed.
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  return app;
}

const cloudSchema = Schema.object({
  properties: {
    customer: Schema.string(),
    kind: Schema.enumString({ enum: ["credit", "payment"] }),
    amount: Schema.number(),
    items: Schema.string(),
  },
});

const LANG_NAMES: Record<LangCode, string> = { en: "English", es: "Spanish", hi: "Hinglish", sw: "Swahili", tl: "Tagalog" };
// Gemini Nano in Chrome reads English and Spanish; Hinglish typed in Latin letters reads as English. Devanagari, Swahili and Tagalog use the cloud.
const ON_DEVICE_LANGS = new Set<LangCode>(["en", "es", "hi"]);
const hybridByLang = new Map<LangCode, GenerativeModel>();

function ai() {
  return getAI(firebaseApp(), { backend: new GoogleAIBackend() });
}

const cloudParams = (lang: LangCode) => ({
  model: "gemini-3.5-flash-lite",
  systemInstruction: entrySystem(LANG_NAMES[lang]),
  generationConfig: { responseMimeType: "application/json", responseSchema: cloudSchema, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
});

function hybridFor(lang: LangCode): GenerativeModel {
  let m = hybridByLang.get(lang);
  if (m) return m;
  // English and Spanish shops run on the device when Chrome has the model; the SDK falls back to the cloud when it does not.
  const deviceLang = lang === "es" ? "es" : "en";
  m = getGenerativeModel(ai(), {
    mode: ON_DEVICE_LANGS.has(lang) ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: cloudParams(lang),
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: [deviceLang] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [{ role: "system", content: [{ type: "text", value: entrySystem(LANG_NAMES[lang]) }] }],
      },
      promptOptions: { responseConstraint: entrySchema },
    },
  });
  hybridByLang.set(lang, m);
  return m;
}

const cloudByLang = new Map<LangCode, GenerativeModel>();
function cloudOnly(lang: LangCode): GenerativeModel {
  let m = cloudByLang.get(lang);
  if (!m) cloudByLang.set(lang, (m = getGenerativeModel(ai(), { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: cloudParams(lang) })));
  return m;
}

export const runsOnDevice = (lang: LangCode) => ON_DEVICE_LANGS.has(lang);

export interface Understood {
  entry: ParsedEntry;
  source: Source;
  ms: number;
}

export async function understand(said: string, lang: LangCode): Promise<Understood> {
  const model = needsCloud(said) ? cloudOnly(lang) : hybridFor(lang);
  const spoken = lang === "hi" ? normaliseNumbers(said) : said;
  // The system prompt names the shop's language, which stops answers in another one (an English entry once came back in Spanish).
  const text = spoken;
  const t = performance.now();
  const res = await model.generateContent(text);
  const source: Source = res.response.inferenceSource === "on_device" ? "on_device" : "in_cloud";
  return { entry: normaliseEntry(res.response.text()), source, ms: Math.round(performance.now() - t) };
}
