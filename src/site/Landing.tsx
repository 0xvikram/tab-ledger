import { useEffect, useRef, useState } from "react";
import { SiteFooter, SiteHeader } from "./Chrome";
import "./site.css";

const COUNTRIES = [
  { word: "Khata", place: "India", line: "A cloth-bound credit book on every counter." },
  { word: "Fiado", place: "Mexico & Latin America", line: "Tortillas today, pesos on payday." },
  { word: "Utang", place: "Philippines", line: "The list behind every sari-sari store." },
  { word: "Deni", place: "Kenya & East Africa", line: "Credit at the neighbourhood duka." },
];

const STACK = [
  { name: "Firebase AI Logic", role: "hybrid inference", kind: "fire", icon: "◆" },
  { name: "Gemini Nano", role: "in Chrome, on the device", kind: "device", icon: "●" },
  { name: "Gemini 3.5 Flash-Lite", role: "in the cloud", kind: "cloud", icon: "◐" },
  { name: "Cloud Firestore", role: "offline cache + rules", kind: "fire", icon: "▤" },
  { name: "App Check", role: "reCAPTCHA Enterprise", kind: "fire", icon: "✓" },
  { name: "Firebase Auth", role: "anonymous, no sign-up", kind: "fire", icon: "◎" },
  { name: "Firebase Hosting", role: "global CDN", kind: "fire", icon: "▲" },
  { name: "Chrome speech", role: "voice on the device", kind: "device", icon: "♪" },
];

const LANG_ROWS = [
  { lang: "English", where: "device", note: "about 4 s, free, works without signal" },
  { lang: "Spanish", where: "device", note: "about 4 s, free, works without signal" },
  { lang: "Hinglish (Latin letters)", where: "device", note: "about 4 s, free, works without signal" },
  { lang: "Hindi script, Swahili, Tagalog", where: "cloud", note: "about 2 to 3 s through Firebase AI Logic" },
  { lang: "Any browser without Gemini Nano", where: "cloud", note: "same app, same card, read in the cloud" },
];

const COMPARE: { feature: string; tab: string; ledger: string; voice: string }[] = [
  { feature: "Speak an entry the way you'd say it", tab: "Yes, 5 languages", ledger: "Mostly typed", voice: "Yes, India only" },
  { feature: "Photograph an old notebook page", tab: "Yes, read line by line", ledger: "No", voice: "Bills or lists only" },
  { feature: "AI that runs on the device", tab: "Yes, free and private", ledger: "No", voice: "No" },
  { feature: "Shows where each entry was read", tab: "On every entry", ledger: "No", voice: "No" },
  { feature: "Built for many countries", tab: "Khata, fiado, utang, deni", ledger: "One country", voice: "One country" },
  { feature: "Sign-up to start", tab: "None", ledger: "Phone or account", voice: "Phone or account" },
  { feature: "Sends reminders for you", tab: "Never. You choose.", ledger: "Automatic SMS", voice: "One tap" },
];

const FAQ = [
  {
    q: "Is my book private?",
    a: "Each shop's book is tied to its own anonymous account, and our database rules only let that account read it. When the AI runs on your device, the words never leave it. Tab never sends a message to your customers.",
  },
  {
    q: "Does it work without internet?",
    a: "Entries save to your device straight away and sync when the signal comes back. In desktop Chrome with Gemini Nano, English and Spanish entries are also read on the device. Other languages, and browsers without Nano, need a signal for the reading step.",
  },
  {
    q: "What does it cost?",
    a: "Tab is free while it is new. Reading on the device costs nothing to run, which is what keeps it free for small shops.",
  },
  {
    q: "What if the AI gets it wrong?",
    a: "Every entry shows a card before it is saved: who, credit or paid back, how much, and what. Fix anything with a tap. The AI never does the maths; amounts are checked and added up in code.",
  },
  {
    q: "Which languages?",
    a: "English, Spanish, Hindi and Hinglish, Swahili and Tagalog today. Non-English entries and reminders show an English line underneath, so anyone can check them.",
  },
  {
    q: "Which phones and browsers?",
    a: "Any modern browser. On-device AI needs desktop Chrome with Gemini Nano today; everywhere else Tab reads entries in the cloud with the same result.",
  },
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = "Tab: the shop credit book you talk to";
  }, []);
  return (
    <div className="site">
      <SiteHeader />

      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">For small shops that sell on credit</p>
            <h1>
              The shop credit book <em>you talk to.</em>
            </h1>
            <p className="lede">
              Say who took what. Tab writes it in your book, adds it up, and drafts a polite reminder when it's time to collect. The AI runs on your
              device first, and uses the cloud only when it has to.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="/app">
                Open your book
              </a>
              <a className="btn ghost" href="/app/demo">
                Try the live demo
              </a>
            </div>
            <p className="fine">Free. No sign-up. Works in your browser.</p>
          </div>
          <div className="hero-media">
            <div className="spoken" aria-hidden>
              <span className="mic-dot" />
              “Maria took two loaves of bread and a carton of milk, six dollars, on credit.”
            </div>
            <img src="/media/entry-en.png" alt="Tab turning a spoken sentence into a credit entry for Maria, six dollars, understood on this device" className="shot tilt" />
            <div className="badge-float">
              <span className="dot good" /> Understood on this device · free
            </div>
          </div>
        </div>
      </section>

      <section className="strip" aria-label="Built with">
        <div className="strip-inner">
          <span className="strip-label">Built on</span>
          <div className="marquee">
            {[0, 1].map((copy) => (
              <ul className="marquee-track" key={copy} aria-hidden={copy === 1}>
                {STACK.map((t) => (
                  <li key={t.name}>
                    <span className={`chip-ico ${t.kind}`} aria-hidden>
                      {t.icon}
                    </span>
                    <span className="chip-name">{t.name}</span>
                    <span className="chip-role">{t.role}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      <section id="problem" className="band">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">The problem</p>
            <h2>
              One notebook, <em>every country.</em>
            </h2>
            <p className="section-lede">
              Corner shops everywhere let regulars take today and pay on Friday. It's how neighbourhoods eat. And it all lives in a paper notebook that
              gets lost, gets the sums wrong, and makes asking for money awkward.
            </p>
          </Reveal>
          <div className="countries">
            {COUNTRIES.map((c, i) => (
              <Reveal key={c.word} className={`country d${i}`}>
                <p className="c-word">{c.word}</p>
                <p className="c-place">{c.place}</p>
                <p className="c-line">{c.line}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="band">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2>
              Say it. Check it. <em>It adds up.</em>
            </h2>
          </Reveal>
          <div className="steps">
            <Reveal className="step">
              <span className="num">1</span>
              <h3>Say it like you'd say it to a person</h3>
              <p>Tap the mic or type. Names, items, amounts and “on credit” or “paid”, in your own words and language.</p>
            </Reveal>
            <Reveal className="step">
              <span className="num">2</span>
              <h3>Check the card, then save</h3>
              <p>Tab shows who, how much and what before anything is saved, and tells you if it was read on your device or in the cloud.</p>
            </Reveal>
            <Reveal className="step">
              <span className="num">3</span>
              <h3>See who owes you, at a glance</h3>
              <p>The total owed, every customer's balance, and what came in this week. Payments clear the oldest credit first.</p>
            </Reveal>
          </div>
          <Reveal className="pair">
            <img src="/media/entry-es.png" alt="A Spanish entry read on the device with an English line underneath" className="shot" loading="lazy" />
            <img src="/media/home.png" alt="The book: customers owe 43 dollars 50 across four people" className="shot" loading="lazy" />
          </Reveal>
        </div>
      </section>

      <section id="hybrid" className="band dark">
        <div className="wrap split">
          <Reveal>
            <p className="eyebrow">On the device first</p>
            <h2>
              Free and private <em>when it can be.</em>
            </h2>
            <p className="section-lede">
              Tab uses Firebase AI Logic hybrid inference. Gemini Nano inside Chrome reads the entry right on your device: no server, no cost, no signal
              needed. When the device can't, the same request goes to Gemini in the cloud. Every entry says which one did the work.
            </p>
          </Reveal>
          <Reveal className="lang-table">
            {LANG_ROWS.map((r) => (
              <div className="lang-row" key={r.lang}>
                <span className="lang">{r.lang}</span>
                <span className={`where ${r.where}`}>{r.where === "device" ? "On the device" : "In the cloud"}</span>
                <span className="note">{r.note}</span>
              </div>
            ))}
            <p className="fine">Timings measured on a MacBook Air in Chrome, 17 Nov 2026.</p>
          </Reveal>
        </div>
      </section>

      <section id="features" className="band">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Built for real shops</p>
            <h2>
              Years of paper, <em>in minutes.</em>
            </h2>
          </Reveal>
          <div className="feature-grid">
            <Reveal className="feature wide">
              <div>
                <h3>Import an old notebook page</h3>
                <p>
                  Take a photo. Tab reads it on your device, line by line, and lets you untick anything crossed out. Or read the page in the cloud in
                  about three seconds.
                </p>
              </div>
              <img src="/media/page.png" alt="A handwritten fiado page read into seven entries" className="shot" loading="lazy" />
            </Reveal>
            <Reveal className="feature">
              <img src="/media/remind.png" alt="A polite reminder drafted in Spanish with an English line underneath" className="shot" loading="lazy" />
              <h3>A polite reminder, never a nag</h3>
              <p>Tab drafts a short, friendly note in your language. It never sends anything. Copy it, or open it in WhatsApp yourself.</p>
            </Reveal>
            <Reveal className="feature">
              <img src="/media/entry-sw.png" alt="A Swahili entry read in the cloud with an English line underneath" className="shot" loading="lazy" />
              <h3>Any language, checked in English</h3>
              <p>Spanish, Hindi, Swahili or Tagalog entries show an English line underneath, so family, staff or an accountant can follow along.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="compare" className="band">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Tab and the alternatives</p>
            <h2>
              Big ledger apps exist. <em>Here's the difference.</em>
            </h2>
            <p className="section-lede">
              Credit-book apps like Khatabook, OkCredit and Treinta serve millions of shops, each in its own region. Voice-first apps are appearing in
              India. Tab is the one that reads on your device, works across countries, and never sends anything on your behalf.
            </p>
          </Reveal>
          <Reveal className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th />
                  <th className="us">Tab</th>
                  <th>Ledger apps</th>
                  <th>Voice ledger apps</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.feature}>
                    <th scope="row">{r.feature}</th>
                    <td className="us">{r.tab}</td>
                    <td>{r.ledger}</td>
                    <td>{r.voice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fine">
              Based on public store pages and comparison pages, November 2026. Ledger apps: Khatabook, OkCredit, Treinta. Voice ledger apps: KhataBhai,
              VoiceKhata. Those apps do more than Tab in places, like payments and invoices.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="trust" className="band">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Why trust it</p>
            <h2>
              Money has to be <em>exactly right.</em>
            </h2>
          </Reveal>
          <div className="trust-grid">
            <Reveal className="trust">
              <p className="big">0</p>
              <p>sums done by the AI. It reads the words; amounts are checked and added in code, stored as whole cents.</p>
            </Reveal>
            <Reveal className="trust">
              <p className="big">5</p>
              <p>languages tested end to end in the live app: English, Spanish, Hinglish, Swahili and Hindi script.</p>
            </Reveal>
            <Reveal className="trust">
              <p className="big">~3 s</p>
              <p>to read a full handwritten notebook page in the cloud. On the device it streams in, line by line, for free.</p>
            </Reveal>
            <Reveal className="trust">
              <p className="big">Offline</p>
              <p>entries save with no signal and sync later. We cut the network, saved an entry, and watched it sync back.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="video" className="band">
        <div className="wrap narrow">
          <Reveal>
            <p className="eyebrow">See it in two minutes</p>
            <h2>
              A week in a corner shop, <em>by voice.</em>
            </h2>
          </Reveal>
          <Reveal className="video-frame">
            <video controls preload="none" poster="/media/tab-demo-poster.jpg" playsInline>
              <source src="/media/tab-demo.mp4" type="video/mp4" />
              <track kind="captions" src="/media/tab-demo.vtt" srcLang="en" label="English" default />
            </video>
          </Reveal>
        </div>
      </section>

      <section id="faq" className="band">
        <div className="wrap narrow">
          <Reveal>
            <p className="eyebrow">Questions</p>
            <h2>Good to know.</h2>
          </Reveal>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band final">
        <div className="wrap narrow center">
          <h2>
            Put the notebook <em>in your pocket.</em>
          </h2>
          <p className="section-lede">Free, no sign-up. Your first entry takes ten seconds.</p>
          <div className="cta-row center">
            <a className="btn primary" href="/app">
              Open your book
            </a>
            <a className="btn ghost light" href="/app/demo">
              Try the live demo
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
