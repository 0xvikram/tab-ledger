import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { runsOnDevice, understand } from "./lib/ai";
import { canListen, listen, localSpeech, modelState, warmUp, type ModelState } from "./lib/device";
import { balances, customerKey, sourceShare, totalOwed, type CustomerBalance, type Entry, type EntryKind, type Source } from "./lib/ledger";
import { formatMoney, toMinor } from "./lib/money";
import { CURRENCIES, LANGS, guessShop, langOf, loadShop, storeShop, type Shop } from "./lib/locale";
import { ParseError, type ParsedEntry } from "./lib/parse";
import { preparePhoto, streamPage, type PageRead } from "./lib/page";
import { draftReminder, oldestUnpaidDays, thisWeek, toEnglish, whatsappLink } from "./lib/remind";
import { removeEntry, saveEntry, watchEntries, watchUser } from "./lib/store";
import "./App.css";

interface Draft {
  said: string;
  customer: string;
  kind: EntryKind;
  amountText: string;
  items: string;
  source: Source;
  ms?: number;
  note?: string;
}

const ShopCtx = createContext<Shop>({ lang: "en", currency: "USD" });
const useShop = () => useContext(ShopCtx);
function useMoney() {
  const { currency } = useShop();
  return (m: number) => formatMoney(m, currency);
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    addEventListener("online", up);
    addEventListener("offline", down);
    return () => {
      removeEventListener("online", up);
      removeEventListener("offline", down);
    };
  }, []);
  return on;
}

const when = (at: number) => {
  const d = new Date(at);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [pending, setPending] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [model, setModel] = useState<ModelState>("unavailable");
  const [shop, setShop] = useState<Shop | null>(() => loadShop());
  const [editingShop, setEditingShop] = useState(false);
  const online = useOnline();

  useEffect(() => watchUser(setUser), []);
  useEffect(() => {
    if (!user) return;
    return watchEntries(
      user.uid,
      (e, p) => {
        setEntries(e);
        setPending(p);
      },
      () => setLoadError("Couldn't open your book. Check the connection and reload."),
    );
  }, [user]);
  useEffect(() => {
    modelState().then((m) => {
      setModel(m);
      if (m === "ready" && shop && runsOnDevice(shop.lang)) void warmUp(shop.lang);
      else if (m === "ready") void warmUp();
    });
  }, [shop]);

  if (user === null) return <Shell><p className="empty">Couldn't start. Check the connection and reload.</p></Shell>;

  if (!shop || editingShop)
    return (
      <Shell>
        <ShopSetup
          initial={shop ?? guessShop(navigator.language)}
          firstRun={!shop}
          currencyLocked={!!shop && !!entries?.length}
          onDone={(s) => {
            storeShop(s);
            setShop(s);
            setEditingShop(false);
          }}
        />
      </Shell>
    );

  return (
    <ShopCtx.Provider value={shop}>
      <Shell online={online} pending={pending} model={model} onSettings={() => setEditingShop(true)}>
        {loadError ? <p className="banner error">{loadError}</p> : null}
        <Ledger uid={user?.uid} entries={entries} model={model} online={online} />
      </Shell>
    </ShopCtx.Provider>
  );
}

function Shell({ children, online, pending = 0, model, onSettings }: { children: React.ReactNode; online?: boolean; pending?: number; model?: ModelState; onSettings?: () => void }) {
  const shop = useShop();
  const onDevice = model === "ready" && runsOnDevice(shop.lang);
  return (
    <div className="page">
      <header className="top">
        <div className="mark">
          <span className="seal" aria-hidden>T</span>
          <span>Tab</span>
        </div>
        <div className="chips">
          {model ? (
            <span className={`chip ${onDevice ? "good" : ""}`} title="Gemini Nano runs inside Chrome on this device; the cloud covers what it cannot">
              {onDevice ? "AI on this device" : model === "ready" ? `${langOf(shop.lang).label}: cloud AI` : model === "unavailable" ? "Cloud AI only" : "On-device AI downloading"}
            </span>
          ) : null}
          {online === false ? (
            <span className="chip warn">Offline{pending ? ` · ${pending} to sync` : ""}</span>
          ) : pending ? (
            <span className="chip">Syncing {pending}</span>
          ) : null}
          {onSettings ? (
            <button className="chip" onClick={onSettings} aria-label="Shop language and currency">
              {langOf(shop.lang).label} · {shop.currency}
            </button>
          ) : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function Ledger({ uid, entries, model, online }: { uid?: string; entries: Entry[] | null; model: ModelState; online: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<CustomerBalance | null>(null);
  const [page, setPage] = useState<Blob | null>(null);
  const list = useMemo(() => (entries ? balances(entries) : []), [entries]);
  const owed = entries ? totalOwed(entries) : 0;
  const owing = list.filter((b) => b.owes > 0).length;
  const share = entries ? sourceShare(entries) : null;
  const money = useMoney();
  const week = entries ? thisWeek(entries) : null;

  return (
    <>
      <section className="hero">
        <p className="label">Customers owe you</p>
        <p className="total">{entries ? money(owed) : "…"}</p>
        <p className="sub">{entries ? (owing ? `${owing} ${owing === 1 ? "person" : "people"} on credit` : "Nobody owes you right now") : "Opening your book"}</p>
        {week && (week.given || week.collected) ? (
          <p className="week">
            This week: <b>{money(week.given)}</b> given on credit · <b>{money(week.collected)}</b> collected
          </p>
        ) : null}
      </section>

      <Composer disabled={!uid} model={model} online={online} onDraft={setDraft} onPage={setPage} />

      {page && uid ? (
        <PageImport
          photo={page}
          online={online}
          model={model}
          onClose={() => setPage(null)}
          onSave={(rows) => {
            const now = Date.now();
            rows.forEach((r, i) => void saveEntry(uid, { ...r, at: now + i }));
            setPage(null);
          }}
        />
      ) : null}

      {draft && uid ? (
        <Confirm
          key={`${draft.said}|${draft.source}|${draft.ms ?? 0}`}
          draft={draft}
          known={list}
          onCancel={() => setDraft(null)}
          onSave={(e) => {
            void saveEntry(uid, e);
            setDraft(null);
          }}
        />
      ) : null}

      <section className="people">
        <h2>Customers</h2>
        {entries === null ? (
          <p className="empty">Loading…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <p>No entries yet.</p>
            <p>Tap the mic and say something like <q>Ramesh, 2 kilo atta, 120, udhaar</q>.</p>
          </div>
        ) : (
          <ul>
            {list.map((b) => (
              <li key={b.key}>
                <button className="row" onClick={() => setOpen(b)}>
                  <span className="name">{b.name}</span>
                  <span className="when">{when(b.lastAt)}</span>
                  <span className={`amt ${b.owes > 0 ? "due" : b.owes < 0 ? "ahead" : "clear"}`}>
                    {b.owes > 0 ? money(b.owes) : b.owes < 0 ? `${money(-b.owes)} advance` : "Settled"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {share && entries && entries.length ? (
        <p className="footnote">
          {share.on_device} of {entries.length} entries understood on this device, free and without internet.
          {share.in_cloud ? ` ${share.in_cloud} needed the cloud.` : ""}
        </p>
      ) : null}

      {open && uid && entries ? (
        <Customer
          who={open}
          entries={entries.filter((e) => (customerKey(e.customer) || e.customer) === open.key)}
          onClose={() => setOpen(null)}
          onDelete={(id) => void removeEntry(uid, id)}
        />
      ) : null}
    </>
  );
}

function Composer({ disabled, model, online, onDraft, onPage }: { disabled: boolean; model: ModelState; online: boolean; onDraft: (d: Draft) => void; onPage: (b: Blob) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const shop = useShop();
  const lang = langOf(shop.lang);
  const deviceAI = model === "ready" && runsOnDevice(shop.lang);
  const [state, setState] = useState<"idle" | "listening" | "thinking">("idle");
  const [error, setError] = useState<string | null>(null);
  const stop = useRef<(() => void) | null>(null);

  async function run(said: string) {
    const s = said.trim();
    if (!s) return;
    setError(null);
    setState("thinking");
    try {
      if (!online && !deviceAI) throw new Error("offline");
      const u = await understand(s, shop.lang);
      onDraft({
        said: s,
        customer: u.entry.customer,
        kind: u.entry.kind,
        amountText: String(u.entry.amount / 100),
        items: u.entry.items,
        source: u.source,
        ms: u.ms,
      });
      setText("");
    } catch (e) {
      const note =
        e instanceof ParseError
          ? `${e.message}. Fill it in below.`
          : !online
            ? "No signal and no on-device AI here, so fill it in by hand. It still saves."
            : "Couldn't understand that one. Fill it in below.";
      onDraft({ said: s, customer: "", kind: "credit", amountText: "", items: "", source: "typed", note });
      setText("");
    } finally {
      setState("idle");
    }
  }

  async function mic() {
    if (state === "listening") {
      stop.current?.();
      return;
    }
    setError(null);
    const local = await localSpeech(lang.speech);
    if (!local && !online) {
      setError("Voice needs signal on this device. Type the entry instead.");
      return;
    }
    setState("listening");
    stop.current = listen(lang.speech, local, {
      partial: setText,
      done: (t) => {
        setText(t);
        void run(t);
      },
      fail: (m) => {
        setError(m);
        setState("idle");
      },
      end: () => setState((s) => (s === "listening" ? "idle" : s)),
    });
  }

  return (
    <section className="composer">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(text);
        }}
      >
        {canListen() ? (
          <button type="button" className={`mic ${state}`} onClick={mic} disabled={disabled || state === "thinking"} aria-label={state === "listening" ? "Stop listening" : "Speak an entry"}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
            </svg>
          </button>
        ) : null}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={lang.example}
          aria-label="Entry"
          disabled={disabled}
        />
        <button className="add" disabled={disabled || !text.trim() || state !== "idle"}>
          {state === "thinking" ? "Reading…" : "Add"}
        </button>
      </form>
      <p className="hint">
        {state === "listening"
          ? "Listening… tap the mic to stop"
          : deviceAI
            ? `Say who took what, how much, and "${lang.credit}" or "${lang.paid}". Read on this device, free.`
            : `Say who took what, how much, and "${lang.credit}" or "${lang.paid}". Read in the cloud.`}
      </p>
      <div className="page-tools">
        <button type="button" className="ghost" disabled={disabled} onClick={() => fileRef.current?.click()}>
          Import a paper page
        </button>
        <button
          type="button"
          className="link"
          disabled={disabled}
          onClick={async () => {
            const r = await fetch("/samples/fiado-page.jpg");
            onPage(await r.blob());
          }}
        >
          Try a sample page
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPage(f);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="banner error">{error}</p> : null}
    </section>
  );
}

type Row = Omit<Entry, "id" | "at">;

function PageImport({ photo, online, model, onClose, onSave }: { photo: Blob; online: boolean; model: ModelState; onClose: () => void; onSave: (rows: Row[]) => void }) {
  const money = useMoney();
  const [img, setImg] = useState<{ base64: string; url: string } | null>(null);
  const [read, setRead] = useState<PageRead | null>(null);
  const [busy, setBusy] = useState<"device" | "cloud" | null>("device");
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState<boolean[]>([]);

  const run = useRef(0);
  const abort = useRef<AbortController | null>(null);

  async function go(where: "auto" | "cloud", data = img) {
    if (!data) return;
    const id = ++run.current;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setError(null);
    setRead(null);
    setBusy(where === "cloud" || model !== "ready" ? "cloud" : "device");
    try {
      if (!online && (where === "cloud" || model !== "ready")) throw new Error("offline");
      const r = await streamPage(
        data.base64,
        where,
        (rows, source) => {
          if (run.current !== id) return;
          setBusy(source === "on_device" ? "device" : "cloud");
          setRead({ entries: rows, skipped: 0, source, ms: 0 });
          setKeep(rows.map(() => true));
        },
        ctl.signal,
      );
      if (run.current !== id) return;
      setRead(r);
      setKeep(r.entries.map(() => true));
    } catch (e) {
      if (run.current !== id) return;
      setError(
        (e as Error).message === "offline"
          ? "Reading a page needs on-device AI or signal. Try again when you have one."
          : e instanceof ParseError
            ? "Couldn't find entries on that page. Try the cloud, or a sharper photo."
            : "Couldn't read that page. Try the cloud, or a sharper photo.",
      );
    } finally {
      if (run.current === id) setBusy(null);
    }
  }

  useEffect(() => {
    let live = true;
    preparePhoto(photo)
      .then((p) => {
        if (!live) return;
        setImg(p);
        void go("auto", p);
      })
      .catch(() => setError("That file is not a photo Tab can open."));
    return () => {
      live = false;
      abort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  const chosen = read ? read.entries.filter((_, i) => keep[i]) : [];
  const toRow = (e: ParsedEntry): Row => ({ ...e, said: "From a paper page", source: read!.source });

  return (
    <div className="sheet-back" onClick={onClose}>
      <section className="sheet import" onClick={(e) => e.stopPropagation()} aria-label="Import a paper page">
        <header>
          <div>
            <h2>Import a paper page</h2>
            <p className="muted">
              {busy === "device"
                ? `Reading on this device, free and private… ${read?.entries.length ? `${read.entries.length} so far` : ""}`
                : busy === "cloud"
                  ? `Reading in the cloud… ${read?.entries.length ? `${read.entries.length} so far` : ""}`
                  : read
                    ? `${read.entries.length} entries found · ${read.source === "on_device" ? "read on this device, free" : "read in the cloud"} · ${(read.ms / 1000).toFixed(1)} s`
                    : ""}
            </p>
          </div>
          <button className="ghost" onClick={onClose}>Close</button>
        </header>
        <div className="import-body">
          {img ? <img src={img.url} alt="The page you imported" className={busy ? "scanning" : ""} /> : null}
          <div>
            {error ? <p className="banner error">{error}</p> : null}
            {read && read.entries.length ? (
              <ul className="found">
                {read.entries.map((e, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={keep[i] ?? false} onChange={() => setKeep(keep.map((k, j) => (j === i ? !k : k)))} />
                      <span className="who">{e.customer}</span>
                      <span className="what">{e.kind === "payment" ? "Paid back" : e.items || "Credit"}</span>
                      <span className={`amt ${e.kind}`}>{e.kind === "credit" ? "+" : "−"}{money(e.amount)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            {read?.skipped ? <p className="muted small">{read.skipped} unclear lines were left out.</p> : null}
            <div className="import-actions">
              {busy === "device" ? (
                <button className="ghost" onClick={() => go("cloud")} disabled={!online}>
                  Faster: read it in the cloud
                </button>
              ) : read && read.source === "on_device" && !busy ? (
                <button className="ghost" onClick={() => go("cloud")} disabled={!online}>
                  Not right? Read it in the cloud
                </button>
              ) : null}
              <button className="primary" disabled={!chosen.length || !!busy} onClick={() => onSave(chosen.map(toRow))}>
                Add {chosen.length || ""} {chosen.length === 1 ? "entry" : "entries"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Confirm({ draft, known, onCancel, onSave }: { draft: Draft; known: CustomerBalance[]; onCancel: () => void; onSave: (e: Omit<Entry, "id">) => void }) {
  const [d, setD] = useState(draft);
  const amount = Number(d.amountText);
  const valid = d.customer.trim() && Number.isFinite(amount) && amount > 0;
  const money = useMoney();
  const { currency } = useShop();
  const currencySymbol = formatMoney(0, currency).replace(/[\d\s.,]/g, "") || currency;
  const match = known.find((k) => k.key === customerKey(d.customer));
  const edited = d.customer !== draft.customer || d.kind !== draft.kind || d.amountText !== draft.amountText;

  return (
    <section className="confirm" aria-label="Check the entry">
      <p className="said">“{d.said}”</p>
      <InEnglish text={d.said} />
      {d.note ? <p className="banner">{d.note}</p> : null}
      <div className="fields">
        <label>
          Customer
          <input value={d.customer} onChange={(e) => setD({ ...d, customer: e.target.value })} list="known" autoFocus={!d.customer} />
          <datalist id="known">{known.map((k) => <option key={k.key} value={k.name} />)}</datalist>
          {match ? <small>Owes {money(Math.max(0, match.owes))} now</small> : d.customer ? <small>New customer</small> : null}
        </label>
        <div className="kind" role="group" aria-label="Kind">
          <button type="button" className={d.kind === "credit" ? "on credit" : ""} onClick={() => setD({ ...d, kind: "credit" })}>Took on credit</button>
          <button type="button" className={d.kind === "payment" ? "on payment" : ""} onClick={() => setD({ ...d, kind: "payment" })}>Paid back</button>
        </div>
        <label>
          Amount ({currencySymbol})
          <input inputMode="decimal" value={d.amountText} onChange={(e) => setD({ ...d, amountText: e.target.value.replace(/[^\d.]/g, "") })} />
        </label>
        {d.kind === "credit" ? (
          <label>
            Items
            <input value={d.items} onChange={(e) => setD({ ...d, items: e.target.value })} placeholder="optional" />
          </label>
        ) : null}
      </div>
      <div className="confirm-foot">
        <span className={`source ${d.source}`}>
          {d.source === "on_device"
            ? `Understood on this device${d.ms ? ` · ${(d.ms / 1000).toFixed(1)} s` : ""} · free`
            : d.source === "in_cloud"
              ? `Understood in the cloud${d.ms ? ` · ${(d.ms / 1000).toFixed(1)} s` : ""}`
              : "Typed by hand"}
          {edited && d.source !== "typed" ? " · you corrected it" : ""}
        </span>
        <div className="actions">
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="primary"
            disabled={!valid}
            onClick={() =>
              onSave({
                customer: d.customer.trim(),
                kind: d.kind,
                amount: toMinor(amount),
                items: d.kind === "credit" ? d.items.trim() : "",
                said: d.said.slice(0, 500),
                source: d.source,
                at: Date.now(),
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </section>
  );
}

function Customer({ who, entries, onClose, onDelete }: { who: CustomerBalance; entries: Entry[]; onClose: () => void; onDelete: (id: string) => void }) {
  const [armed, setArmed] = useState<string | null>(null);
  const money = useMoney();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="sheet-back" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label={`${who.name}'s account`}>
        <header>
          <div>
            <h2>{who.name}</h2>
            <p className={who.owes > 0 ? "due" : "clear"}>{who.owes > 0 ? `Owes ${money(who.owes)}` : who.owes < 0 ? `${money(-who.owes)} paid in advance` : "All settled"}</p>
          </div>
          <button className="ghost" onClick={onClose} aria-label="Close">Close</button>
        </header>
        {who.owes > 0 ? <Reminder who={who} entries={entries} /> : null}
        <ul className="history">
          {entries.map((e) => (
            <li key={e.id}>
              <div>
                <span className={e.kind}>{e.kind === "credit" ? "Credit" : "Paid"}</span>
                <span className="items">{e.items || (e.kind === "payment" ? "Payment" : "")}</span>
                <small>{when(e.at)} · {e.source === "on_device" ? "on device" : e.source === "in_cloud" ? "cloud" : "typed"}</small>
              </div>
              <span className={`amt ${e.kind}`}>{e.kind === "credit" ? "+" : "−"}{money(e.amount)}</span>
              <button
                className={`del ${armed === e.id ? "armed" : ""}`}
                onClick={() => (armed === e.id ? onDelete(e.id) : setArmed(e.id))}
                aria-label={armed === e.id ? "Tap again to delete" : "Delete entry"}
                title={armed === e.id ? "Tap again to delete" : "Delete"}
              >
                {armed === e.id ? "✓" : "×"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ShopSetup({ initial, firstRun, currencyLocked, onDone }: { initial: Shop; firstRun: boolean; currencyLocked: boolean; onDone: (s: Shop) => void }) {
  const [s, setS] = useState(initial);
  return (
    <section className="setup">
      {firstRun ? (
        <>
          <h1>Your shop's credit book, by voice.</h1>
          <p className="lede">
            Say who took what on credit. Tab writes it down, adds it up, and shows who owes you. It works with no signal, because the AI runs on this
            device first and uses the cloud only when it has to.
          </p>
        </>
      ) : (
        <h1>Shop settings</h1>
      )}
      <label>
        Language you speak in the shop
        <select value={s.lang} onChange={(e) => setS({ ...s, lang: e.target.value as Shop["lang"] })}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
              {runsOnDevice(l.code) ? " (works offline)" : " (needs signal)"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Currency
        <select value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} disabled={currencyLocked}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({formatMoney(0, c.code).replace(/[\d\s.,]/g, "") || c.code})
            </option>
          ))}
        </select>
      </label>
      {currencyLocked ? <p className="hint">The currency is fixed once your book has entries, so old amounts never change meaning.</p> : null}
      <p className="hint">Example: “{langOf(s.lang).example}”</p>
      <button className="primary wide" onClick={() => onDone(s)}>
        {firstRun ? "Open my book" : "Save"}
      </button>
    </section>
  );
}

function Reminder({ who, entries }: { who: CustomerBalance; entries: Entry[] }) {
  const shop = useShop();
  const money = useMoney();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [copied, setCopied] = useState(false);
  const days = oldestUnpaidDays(entries);

  async function draft() {
    setState("busy");
    setCopied(false);
    try {
      const r = await draftReminder({
        name: who.name,
        owes: money(who.owes),
        items: entries.filter((e) => e.kind === "credit" && e.items).map((e) => e.items),
        days,
        lang: shop.lang,
      });
      setText(r.text);
      setMeta(r.source === "on_device" ? `Written on this device · ${(r.ms / 1000).toFixed(1)} s · free` : `Written in the cloud · ${(r.ms / 1000).toFixed(1)} s`);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="remind">
      {state === "idle" || state === "error" ? (
        <>
          <button className="ghost" onClick={draft}>Draft a polite reminder</button>
          <span className="muted small">{days ? `Oldest unpaid: ${days} ${days === 1 ? "day" : "days"} ago` : "Unpaid since today"}</span>
          {state === "error" ? <p className="banner error">Couldn't write a draft right now. Try again in a moment.</p> : null}
        </>
      ) : state === "busy" ? (
        <p className="muted">Writing a short, friendly note…</p>
      ) : (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Reminder message" />
          <InEnglish text={text} />
          <div className="remind-foot">
            <span className="source on_device">{meta}</span>
            <div className="actions">
              <button
                className="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <a className="primary as-btn" href={whatsappLink(text)} target="_blank" rel="noreferrer">
                Open in WhatsApp
              </a>
            </div>
          </div>
          <p className="muted small">Tab never sends anything. You choose who gets this.</p>
        </>
      )}
    </div>
  );
}

function InEnglish({ text }: { text: string }) {
  const { lang } = useShop();
  const [gloss, setGloss] = useState<string | null>(null);
  useEffect(() => {
    if (lang === "en" || !text.trim() || !navigator.onLine) return;
    let live = true;
    const t = setTimeout(() => {
      toEnglish(text)
        .then((g) => live && setGloss(g))
        .catch(() => undefined);
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text, lang]);
  if (lang === "en" || !gloss) return null;
  return <p className="gloss">In English: {gloss}</p>;
}
