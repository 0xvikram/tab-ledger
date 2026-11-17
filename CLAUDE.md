# Tab (was Khata): working notes

Entry for Firebase #BuildHybridAI 2026 on Devpost (https://firebasehybridaihackathon.devpost.com/).
Deadline: **1 Dec 2026, 03:30 IST** (30 Nov 2:00 pm PST). Judging 9 to 16 Dec, winners 21 Dec.
Prizes: Grand $10,000, runner-up $7,000 and $4,000, Best Web/Chrome app $3,000 (our target category), Best Android, Best iOS. India is eligible.

## The brief, word for word (read 16 Nov 2026)

> On-device models are fast, private and free to run, but they aren't on every device. #BuildHybridAI challenges you to build apps that use both. Using the Firebase AI Logic Hybrid Inference SDK, your app runs prompts on-device when a local model is available and falls back to the cloud when it isn't.

> Build a Gen AI application using Firebase AI Logic along with supported firebase products such as: AppCheck, RemoteConfig, Firestore and Authentication.
> Web (Chrome): Gemini Nano 4 via Firebase AI Logic. Build a web app or a Chrome extension.
> Firebase AI Logic requires App Check; debug tokens are accepted in submissions.

> Judging: Technological Implementation (how effectively it uses Firebase AI Logic hybrid inference), Design (a complete, coherent product, not a proof of concept), Potential Impact (a credible, specific case for a real problem for a real audience), Quality of the Idea (creative, non-obvious use of Firebase AI Logic).

Submission checklist: working demo link (free, no restrictions for judges); public GitHub repo with an open source license visible in the About section (Apache preferred); Firebase AI Logic imported AND called at runtime; video of 3 minutes or less showing it working on the platform; text description (how Firebase AI Logic is used, features, value proposition); no production keys, secrets or PII in the repo or form; English.

## Fit check

1. Core ask: a complete product where hybrid inference (on-device first, cloud fallback) is the point.
2. Tab: the shop credit book you talk to. Small shops everywhere sell on credit and keep it in a notebook (khata in India, fiado in Latin America, utang in the Philippines, deni in East Africa). Say "Doña Lupe, dos kilos de tortilla, 60 pesos, fiado" and it becomes an entry, even offline. Global framing is mandatory (see memory global-pov-for-hacks): English-first demo, 2 to 3 countries shown.
3. Why hybrid is the product, not an add-on: shops have patchy signal and thin margins, so entries must work offline and cost nothing (on-device). Chrome's on-device model reads English and Spanish (also fr, ja); Hindi, Swahili, Tagalog and non-Latin scripts go to the cloud. The app shows which side read every entry. Verified 17 Nov: Spanish on-device 3.9 s, Swahili cloud 8.1 s, Hinglish on-device 2.2 s.
4. Firebase products: AI Logic (hybrid), App Check, Anonymous Auth, Firestore with offline persistence, Remote Config (prompt and model tuning), Hosting.

## Facts learned (16 Nov 2026)

- firebase@13.3.0. The SDK's on-device path takes text and JPEG/PNG images only, no audio. Voice goes through Chrome's SpeechRecognition (on-device recognition for en-IN and hi-IN is downloadable), then text to the model.
- Vikram's Chrome 157: LanguageModel availability "downloadable" for en text and en text+image; "unavailable" for hi text input. So Hindi (Devanagari) entries route to the cloud.
- Default on-device expectedInputs in the SDK are en text + image. `response.inferenceSource` tells which side answered.

## Rivals (public GitHub repos, 16 Nov 2026; about 30)

Crowded: privacy or PII redaction gates (RedactRelay, redact-first, privacy-relay, PII-Zero, Veil), document or compliance auditors (OmniAudit, Tender Lens, HushLedger bill auditor, Sentinel), offline disaster helpers (Lifeline), senior safety extension (senior-safesurf), worksheet marker (Tickmark), form filler (FormSathi, Indian). None found doing a shop credit ledger.

## Quality bar

Launch-ready, not a demo. Every state has an empty, loading, offline and error view. Plain short copy, no hype, no emoji, no em dashes. Money maths is exact (integer paise). Nothing is sent to a customer automatically; reminders are drafts the shopkeeper sends.

## Phases

1. Spike: Nano parses spoken-style entries into JSON reliably (spike.html). GO or switch to the bill-split idea.
2. Core app: ledger, voice and typed entry, hybrid parse with source badge, Firestore offline, anonymous auth, App Check.
3. Paper page import (image), weekly summary and reminders (cloud), Remote Config.
4. Design pass, tests, deploy to Firebase Hosting.
5. README, video (3 min max), submission text. Vikram registers and submits.

## Rules

- No secrets in the repo. Firebase web config is public by design; App Check debug tokens stay out of git.
- Do not push, create the GitHub repo, deploy publicly or submit without Vikram.
- Tests and typecheck pass before every commit.
