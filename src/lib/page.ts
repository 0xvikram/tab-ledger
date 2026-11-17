// Turn a photo of a paper credit-book page into entries.
// On-device first (Gemini Nano reads JPEG/PNG in Chrome); the cloud reads pages the device cannot.
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema, ThinkingLevel, type GenerativeModel } from "firebase/ai";
import { firebaseApp } from "./ai";
import type { Source } from "./ledger";
import { normaliseEntry, ParseError, type ParsedEntry } from "./parse";

export const PAGE_PROMPT = `This photo is a page from a small shop's credit notebook (khata, fiado, utang or deni book).
List every line that records a customer taking goods on credit or paying money back.
For each line give: customer (name as written), kind ("credit" or "payment"), amount (number only), items (short, as written, "" for payments).
Skip totals, dates on their own, crossed-out lines and anything you cannot read. If the page has no entries, return an empty list.`;

const pageSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          customer: { type: "string" },
          kind: { type: "string", enum: ["credit", "payment"] },
          amount: { type: "number" },
          items: { type: "string" },
        },
        required: ["customer", "kind", "amount", "items"],
      },
    },
  },
  required: ["entries"],
} as const;

const cloudPageSchema = Schema.object({
  properties: {
    entries: Schema.array({
      items: Schema.object({
        properties: {
          customer: Schema.string(),
          kind: Schema.enumString({ enum: ["credit", "payment"] }),
          amount: Schema.number(),
          items: Schema.string(),
        },
      }),
    }),
  },
});

let hybrid: GenerativeModel | null = null;
let cloud: GenerativeModel | null = null;

function models() {
  if (hybrid && cloud) return { hybrid, cloud };
  const ai = getAI(firebaseApp(), { backend: new GoogleAIBackend() });
  const inCloudParams = {
    // Minimal thinking: 3.5 s for a full page instead of over a minute.
    model: "gemini-3.5-flash-lite",
    generationConfig: { responseMimeType: "application/json", responseSchema: cloudPageSchema, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  };
  hybrid = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }, { type: "image" }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      },
      promptOptions: { responseConstraint: pageSchema },
    },
  });
  cloud = getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams });
  return { hybrid, cloud };
}

// Shrinks the photo so it is quick to read and small to send; always JPEG (the on-device model accepts JPEG and PNG).
export async function preparePhoto(file: Blob, maxSide = 1024): Promise<{ base64: string; url: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: url.split(",")[1], url };
}

export interface PageRead {
  entries: ParsedEntry[];
  skipped: number; // lines the model returned that failed validation
  source: Source;
  ms: number;
}

export function parsePage(raw: string): { entries: ParsedEntry[]; skipped: number } {
  let obj: unknown;
  try {
    obj = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new ParseError("The page answer was not JSON");
  }
  const list = Array.isArray(obj) ? obj : (obj as { entries?: unknown[] })?.entries;
  if (!Array.isArray(list)) throw new ParseError("No entries found on the page");
  const entries: ParsedEntry[] = [];
  let skipped = 0;
  for (const item of list.slice(0, 60)) {
    try {
      entries.push(normaliseEntry(item));
    } catch {
      skipped++;
    }
  }
  return { entries, skipped };
}

export async function readPage(base64: string, where: "auto" | "cloud"): Promise<PageRead> {
  const m = models();
  const model = where === "cloud" ? m.cloud : m.hybrid;
  const t = performance.now();
  const res = await model.generateContent([
    { type: "text", text: PAGE_PROMPT },
    { type: "inlineData", inlineData: { mimeType: "image/jpeg", data: base64 } },
  ]);
  const source: Source = res.response.inferenceSource === "on_device" ? "on_device" : "in_cloud";
  const { entries, skipped } = parsePage(res.response.text());
  return { entries, skipped, source, ms: Math.round(performance.now() - t) };
}

// Pulls every complete {...} entry object out of a partial JSON answer, so rows can appear while the model is still writing.
export function completeObjects(partial: string): string[] {
  const start = partial.indexOf("[");
  if (start < 0) return [];
  const out: string[] = [];
  let depth = 0;
  let from = -1;
  let inStr = false;
  for (let i = start + 1; i < partial.length; i++) {
    const c = partial[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") {
      if (depth === 0) from = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && from >= 0) out.push(partial.slice(from, i + 1));
    }
  }
  return out;
}

// Streams rows as the model writes them. Returns the final read.
export async function streamPage(base64: string, where: "auto" | "cloud", onRow: (rows: ParsedEntry[], source: Source) => void, signal?: AbortSignal): Promise<PageRead> {
  const m = models();
  const model = where === "cloud" ? m.cloud : m.hybrid;
  const t = performance.now();
  const res = await model.generateContentStream([
    { type: "text", text: PAGE_PROMPT },
    { type: "inlineData", inlineData: { mimeType: "image/jpeg", data: base64 } },
  ]);
  let text = "";
  let source: Source = "in_cloud";
  let seen = 0;
  for await (const chunk of res.stream) {
    if (signal?.aborted) break;
    if (chunk.inferenceSource === "on_device") source = "on_device";
    text += chunk.text();
    const objs = completeObjects(text);
    if (objs.length > seen) {
      seen = objs.length;
      const rows: ParsedEntry[] = [];
      for (const o of objs) {
        try {
          rows.push(normaliseEntry(o));
        } catch {
          /* unreadable line, counted at the end */
        }
      }
      onRow(rows, source);
    }
  }
  const objs = completeObjects(text);
  const entries: ParsedEntry[] = [];
  for (const o of objs) {
    try {
      entries.push(normaliseEntry(o));
    } catch {
      /* skipped */
    }
  }
  if (!objs.length && !signal?.aborted) {
    const parsed = parsePage(text); // throws a clear ParseError on garbage
    return { ...parsed, source, ms: Math.round(performance.now() - t) };
  }
  return { entries, skipped: objs.length - entries.length, source, ms: Math.round(performance.now() - t) };
}
