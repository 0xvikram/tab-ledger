// Turns spoken Hindi/Hinglish number words into digits before the model sees them,
// so the model only has to find the structure, never do arithmetic.
// "dedh sau" -> "150", "teen sau bees" -> "320", "do hazaar paanch sau" -> "2500".

const UNITS: Record<string, number> = {
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, che: 6,
  saat: 7, aath: 8, nau: 9, das: 10, dus: 10, gyarah: 11, barah: 12, baarah: 12, terah: 13,
  chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19,
  bees: 20, bis: 20, pachchis: 25, pachees: 25, tees: 30, tis: 30, chalis: 40, chaalis: 40,
  pachaas: 50, pachas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90, nabbey: 90,
};
// Fractions that multiply the next scale word: dedh sau = 1.5 x 100, dhai hazaar = 2.5 x 1000.
const FRACTIONS: Record<string, number> = { dedh: 1.5, derh: 1.5, dhai: 2.5, dhaai: 2.5, adhai: 2.5 };
const SCALES: Record<string, number> = { sau: 100, hazaar: 1000, hazar: 1000, hajar: 1000, lakh: 100000, lac: 100000 };

function isNumberWord(w: string): boolean {
  return w in UNITS || w in FRACTIONS || w in SCALES || /^\d+$/.test(w);
}

function value(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let pendingFraction = 0;
  for (const w of words) {
    if (/^\d+$/.test(w)) current += Number(w);
    else if (w in UNITS) current += UNITS[w];
    else if (w in FRACTIONS) pendingFraction = FRACTIONS[w];
    else if (w in SCALES) {
      const base = pendingFraction || current || 1;
      total += base * SCALES[w];
      current = 0;
      pendingFraction = 0;
    }
  }
  if (pendingFraction) return null; // "dedh" alone is not an amount
  const v = total + current;
  return v > 0 ? v : null;
}

export function normaliseNumbers(said: string): string {
  const tokens = said.split(/(\s+)/);
  const out: string[] = [];
  let run: string[] = [];
  let runRaw: string[] = [];
  const flush = () => {
    if (!run.length) return;
    // A run needs a scale word or fraction to be rewritten; lone "do"/"ek" are often not amounts.
    const hasScale = run.some((w) => w in SCALES || w in FRACTIONS);
    const v = hasScale ? value(run) : null;
    out.push(v !== null ? String(v) : runRaw.join(""));
    run = [];
    runRaw = [];
  };
  for (const tok of tokens) {
    const w = tok.toLowerCase().replace(/[.,!?]$/, "");
    if (/^\s+$/.test(tok)) {
      if (run.length) runRaw.push(tok);
      else out.push(tok);
      continue;
    }
    if (isNumberWord(w)) {
      run.push(w);
      runRaw.push(tok);
    } else {
      // keep trailing whitespace captured inside the run outside of it
      const trailing: string[] = [];
      while (runRaw.length && /^\s+$/.test(runRaw[runRaw.length - 1])) trailing.unshift(runRaw.pop()!);
      flush();
      out.push(...trailing, tok);
    }
  }
  flush();
  return out.join("");
}
