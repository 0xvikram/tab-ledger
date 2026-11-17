import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema, ThinkingLevel, type GenerativeModel } from "firebase/ai";
import { ENTRY_SYSTEM, entrySchema, needsCloud, normaliseEntry, type ParsedEntry } from "./parse";
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
let cloudModel: GenerativeModel | null = null;

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

const ON_DEVICE_LANGS = new Set<LangCode>(["en", "es"]); // Gemini Nano in Chrome reads these; others use the cloud
const hybridByLang = new Map<LangCode, GenerativeModel>();

function ai() {
  return getAI(firebaseApp(), { backend: new GoogleAIBackend() });
}

const inCloudParams = {
  model: "gemini-3.5-flash-lite",
  systemInstruction: ENTRY_SYSTEM,
  generationConfig: { responseMimeType: "application/json", responseSchema: cloudSchema, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
};

function hybridFor(lang: LangCode): GenerativeModel {
  let m = hybridByLang.get(lang);
  if (m) return m;
  // English and Spanish shops run on the device when Chrome has the model; the SDK falls back to the cloud when it does not.
  const deviceLang = ON_DEVICE_LANGS.has(lang) ? lang : "en";
  m = getGenerativeModel(ai(), {
    mode: ON_DEVICE_LANGS.has(lang) ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_IN_CLOUD,
    inCloudParams,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: [deviceLang] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [{ role: "system", content: [{ type: "text", value: ENTRY_SYSTEM }] }],
      },
      promptOptions: { responseConstraint: entrySchema },
    },
  });
  hybridByLang.set(lang, m);
  return m;
}

function cloudOnly(): GenerativeModel {
  if (!cloudModel) cloudModel = getGenerativeModel(ai(), { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams });
  return cloudModel;
}

export const runsOnDevice = (lang: LangCode) => ON_DEVICE_LANGS.has(lang);

export interface Understood {
  entry: ParsedEntry;
  source: Source;
  ms: number;
}

export async function understand(said: string, lang: LangCode): Promise<Understood> {
  const model = needsCloud(said) ? cloudOnly() : hybridFor(lang);
  const text = lang === "hi" ? normaliseNumbers(said) : said;
  const t = performance.now();
  const res = await model.generateContent(text);
  const source: Source = res.response.inferenceSource === "on_device" ? "on_device" : "in_cloud";
  return { entry: normaliseEntry(res.response.text()), source, ms: Math.round(performance.now() - t) };
}
