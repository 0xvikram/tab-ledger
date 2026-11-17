// What this browser can do on its own: the on-device model and on-device speech.

export type ModelState = "ready" | "downloadable" | "downloading" | "unavailable";

interface LM {
  availability(o: unknown): Promise<string>;
}

const OPTS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

export async function modelState(): Promise<ModelState> {
  const lm = (globalThis as unknown as { LanguageModel?: LM }).LanguageModel;
  if (!lm) return "unavailable";
  try {
    const a = await lm.availability(OPTS);
    return a === "available" ? "ready" : (a as ModelState);
  } catch {
    return "unavailable";
  }
}

type SRCtor = new () => SpeechRec;
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally?: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function ctor(): (SRCtor & { available?: (o: unknown) => Promise<string>; install?: (o: unknown) => Promise<boolean> }) | null {
  const w = globalThis as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as never;
}

export const canListen = () => ctor() !== null;

export type Lang = string; // BCP-47 speech tag, e.g. es-MX

// Prefer recognition on the device (works with no signal); falls back to Chrome's server recognition.
export async function localSpeech(lang: Lang): Promise<boolean> {
  const C = ctor();
  if (!C?.available) return false;
  try {
    const a = await C.available({ langs: [lang], processLocally: true });
    if (a === "available") return true;
    if ((a === "downloadable" || a === "downloading") && C.install) return await C.install({ langs: [lang], processLocally: true });
  } catch {
    /* not supported */
  }
  return false;
}

export function listen(
  lang: Lang,
  local: boolean,
  on: { partial: (t: string) => void; done: (t: string) => void; fail: (reason: string) => void; end: () => void },
): () => void {
  const C = ctor();
  if (!C) {
    on.fail("This browser cannot listen. Type the entry instead.");
    return () => {};
  }
  const r = new C();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  if (local) r.processLocally = true;
  let text = "";
  r.onresult = (e) => {
    text = Array.from(e.results)
      .map((x) => x[0].transcript)
      .join(" ");
    on.partial(text);
  };
  r.onerror = (e) => {
    const msg: Record<string, string> = {
      "not-allowed": "Microphone is blocked. Allow it in the address bar, or type instead.",
      "no-speech": "Didn't hear anything. Tap the mic and speak.",
      network: "Voice needs signal on this phone. Type the entry instead.",
      "language-not-supported": "Voice in this language is not ready on this device yet. Type instead.",
    };
    on.fail(msg[e.error] ?? "Couldn't hear that. Try again or type it.");
  };
  r.onend = () => {
    if (text.trim()) on.done(text.trim());
    else on.end();
  };
  r.start();
  return () => r.stop();
}

// Loads Gemini Nano into memory once so the first real entry is fast (first load can take ~8 s).
// Also loads output in the shop's language (Spanish reminders were 33 s cold, 3 s warm).
export async function warmUp(shopLang = "en"): Promise<void> {
  const lm = (globalThis as unknown as { LanguageModel?: LM & { create(o: unknown): Promise<{ destroy(): void }> } }).LanguageModel;
  if (!lm) return;
  const configs = [OPTS];
  if (shopLang !== "en") configs.push({ ...OPTS, expectedOutputs: [{ type: "text", languages: [shopLang] }] });
  for (const c of configs) {
    try {
      const s = await lm.create(c);
      s.destroy();
    } catch {
      /* not ready for this language; the cloud covers it */
    }
  }
}
