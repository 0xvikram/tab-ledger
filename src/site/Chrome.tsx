export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="mark-svg">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#9e1b1b" />
      <rect x="4.5" y="4.5" width="23" height="23" rx="5" fill="none" stroke="#ffe0a0" strokeOpacity=".45" strokeDasharray="2 2" />
      <path d="M10 11h12M16 11v11" stroke="#fff7e6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <a href="/" className="brand" aria-label="Tab home">
          <Mark />
          <span>Tab</span>
        </a>
        <nav className="nav" aria-label="Main">
          <a href="/#how">How it works</a>
          <a href="/#hybrid">On-device AI</a>
          <a href="/#compare">Compare</a>
          <a href="/#faq">FAQ</a>
        </nav>
        <div className="header-cta">
          <a href="/app/demo" className="btn small ghost hide-sm">
            Live demo
          </a>
          <a href="/app" className="btn small primary">
            Open your book
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <a href="/" className="brand">
            <Mark />
            <span>Tab</span>
          </a>
          <p className="muted">The shop credit book you talk to. Khata, fiado, utang, deni: one book, by voice.</p>
        </div>
        <div>
          <p className="f-head">Product</p>
          <a href="/app">Open your book</a>
          <a href="/app/demo">Live demo</a>
          <a href="/#how">How it works</a>
          <a href="/#faq">FAQ</a>
        </div>
        <div>
          <p className="f-head">Builders</p>
          <a href="https://github.com/0xvikram/tab-ledger">Source code</a>
          <a href="https://github.com/0xvikram/tab-ledger#how-it-uses-firebase-ai-logic-hybrid-inference">How the hybrid AI works</a>
          <a href="https://firebasehybridaihackathon.devpost.com/">#BuildHybridAI 2026</a>
        </div>
        <div>
          <p className="f-head">Trust</p>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
      <div className="wrap footer-base">
        <span>© 2026 Tab</span>
        <span>Built with Firebase AI Logic, Gemini Nano and Gemini</span>
      </div>
    </footer>
  );
}
