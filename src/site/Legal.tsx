import { useEffect } from "react";
import { SiteFooter, SiteHeader } from "./Chrome";
import "./site.css";

const UPDATED = "17 November 2026";

export function Privacy() {
  useEffect(() => {
    document.title = "Privacy · Tab";
  }, []);
  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap narrow legal">
        <h1>Privacy</h1>
        <p className="muted">Last updated {UPDATED}. Plain words, describing what the app actually does.</p>
        <h2>What Tab stores</h2>
        <p>
          The entries you save: customer name, credit or payment, amount, items, the words you said or typed, which side read them (your device or the
          cloud) and the time. They are stored in Google Cloud Firestore under an anonymous account created for your browser. No name, email or phone
          number is needed.
        </p>
        <h2>Who can see your book</h2>
        <p>
          Only your browser's account. Our database rules refuse reads and writes from any other account. We do not sell or share your data. The live
          demo at /app/demo keeps everything in memory and saves nothing.
        </p>
        <h2>The AI</h2>
        <p>
          When your browser has Gemini Nano, entries in English, Spanish and Latin-letter Hinglish are read on your device and the words are not sent
          anywhere for reading. Other entries, notebook photos read in the cloud, reminders in some languages and English translations are sent to
          Google's Gemini models through Firebase AI Logic to produce the answer. Voice input uses your browser's speech recognition, which may run on
          your device or on your browser maker's servers.
        </p>
        <h2>Messages to your customers</h2>
        <p>Tab never sends anything to anyone. Reminders are drafts you copy or open in WhatsApp yourself.</p>
        <h2>Security</h2>
        <p>Every AI request is checked with Firebase App Check (reCAPTCHA Enterprise) to block abuse. Data travels over HTTPS.</p>
        <h2>Deleting your data</h2>
        <p>
          Delete any entry from the customer's page. Clearing your browser's site data removes your access to the book on that device; anonymous
          books can't be recovered after that.
        </p>
        <h2>Contact</h2>
        <p>
          Questions: open an issue at <a href="https://github.com/0xvikram/tab-ledger/issues">github.com/0xvikram/tab-ledger</a>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Terms() {
  useEffect(() => {
    document.title = "Terms · Tab";
  }, []);
  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap narrow legal">
        <h1>Terms</h1>
        <p className="muted">Last updated {UPDATED}.</p>
        <h2>Free and as is</h2>
        <p>
          Tab is a free early product, offered as is, without warranties. It is open source under the Apache 2.0 license. Features may change while
          it is new.
        </p>
        <h2>You check the numbers</h2>
        <p>
          AI can misread. Tab shows every entry before it is saved so you can correct it, but you are responsible for the amounts in your book and for
          any message you send to a customer.
        </p>
        <h2>Fair use</h2>
        <p>Don't use Tab to harass anyone, to collect debts in ways the law forbids, or to overload the service.</p>
        <h2>Your data</h2>
        <p>
          Your book is yours. See the <a href="/privacy">privacy page</a> for what is stored and how.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
