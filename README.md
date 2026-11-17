# Tab: the shop credit book you talk to

**Live app:** https://khata-ledger-2026.web.app · Built for Firebase #BuildHybridAI 2026 (Web / Chrome)

Small shops all over the world sell on credit and write it in a paper notebook: the *khata* in India, *fiado* in Mexico and Latin America, *utang* at a Philippine sari-sari store, *deni* at a Kenyan duka. The notebook gets lost, the sums go wrong, and asking a regular customer for money is awkward.

With Tab, the shopkeeper just says it: *"Maria, two loaves of bread and milk, six, on credit."* Tab writes the entry, adds up who owes what, and drafts a polite reminder when it is time to collect. It keeps working with no signal, because the AI runs on the device first and uses the cloud only when it has to.

## How it uses Firebase AI Logic hybrid inference

Every AI call goes through the Firebase AI Logic SDK (`firebase/ai`) with `InferenceMode.PREFER_ON_DEVICE`: Gemini Nano inside Chrome when the device has it, Gemini in the cloud when it does not. Every entry shows which side read it ("Understood on this device · 2.2 s · free" or "Understood in the cloud").

| Feature | On the device (Gemini Nano in Chrome) | In the cloud (Gemini via Firebase AI Logic) |
| --- | --- | --- |
| Spoken or typed entry to a ledger row | English and Spanish shops, works offline | Hindi, Swahili, Tagalog and any non-Latin script, and browsers without Nano |
| Photo of a paper credit-book page to entries | Rows stream in as the model reads them; free and private | One tap, about 3 s, best on messy pages |
| Polite payment reminder | English and Spanish | Other languages |
| English line under non-English text | | Always cloud |

Code: [`src/lib/ai.ts`](src/lib/ai.ts) (entries), [`src/lib/page.ts`](src/lib/page.ts) (paper pages, streamed), [`src/lib/remind.ts`](src/lib/remind.ts) (reminders, English gloss).

Things we learned and built around:

- Chrome's on-device model accepts English, Spanish, French and Japanese text and JPEG/PNG images, but not audio or Hindi. Voice goes through Chrome's speech recognition (on-device where available), then the text goes to the model. Languages the device cannot read are routed to the cloud on purpose.
- The model never does arithmetic. Spoken Hindi number words ("dedh sau" = 150) are turned into digits in code first ([`src/lib/numbers.ts`](src/lib/numbers.ts)), money is stored in integer minor units, and every model answer is validated before it can be saved ([`src/lib/parse.ts`](src/lib/parse.ts)).
- Cloud calls use minimal thinking: a typed entry went from 7.5 s to 1.5 s, a full page to about 3 s.
- The on-device model is warmed up when the app opens, in the shop's language (a first Spanish reminder took 33 s cold, 3 s warm).

## Other Firebase products

- **App Check** (reCAPTCHA Enterprise) protects every AI call.
- **Authentication**: anonymous sign-in, so a shop has a private book with no sign-up.
- **Cloud Firestore** with the persistent offline cache: entries save instantly with no signal and sync later. Security rules ([`firestore.rules`](firestore.rules)) let each shop read only its own book and reject malformed entries.
- **Hosting** for the live app.

## Try it

1. Open https://khata-ledger-2026.web.app in Chrome (desktop Chrome with Gemini Nano shows on-device mode; any other browser uses the cloud).
2. Pick the language you speak in the shop and your currency.
3. Tap the mic or type: `Maria, 2 loaves of bread and milk, 6, on credit`. Check the card and save.
4. Tap **Try a sample page** to import a handwritten Spanish credit-book page.
5. Open a customer who owes money and tap **Draft a polite reminder**. Tab never sends anything; you copy it or open it in WhatsApp.

To see on-device mode: Chrome 138 or later on a desktop that meets the [built-in AI requirements](https://developer.chrome.com/docs/ai/get-started). The first visit downloads Gemini Nano in the background.

## Run it yourself

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config and reCAPTCHA Enterprise site key
npm run dev                  # prints an App Check debug token on first load; register it in the Firebase console
npm test                     # 25 unit tests: money, ledger, parsing, number words, page streaming, reminders
npm run build && firebase deploy
```

Your Firebase project needs: AI Logic (Gemini Developer API), App Check with reCAPTCHA Enterprise, Firestore, anonymous Authentication.

## Built during the hackathon

Everything in this repository was written during the #BuildHybridAI submission period (from 16 Nov 2026), starting from the Vite React TypeScript template. AI coding assistance (Claude Code) was used. The sample notebook page in `public/samples/` is a rendered image made for this project.

## License

Apache 2.0. See [LICENSE](LICENSE).
