// IELTS word list lookups and gloss checks, built on data/ielts.json.
// Pure functions over a loaded list, so tests can pass a small one.

const POS_PREFIX = /^(?:(?:n|v|vt|vi|adj|a|adv|ad|prep|conj|pron|num|int|interj|art|abbr|aux|pl|s)\.\s*)+/i;
const LABEL = /\[[^\]]*\]/g; // [网络], [计], [医] …
const CJK = /\p{Script=Han}/u;

// Words this common are too basic to be worth teaching at IELTS level.
export const BASIC_RANK = 2500;

// "n. 庇护；避难所；遮蔽物" → ["庇护", "避难所", "遮蔽物"]
export function meaningTerms(lines) {
  const terms = new Set();
  for (const raw of lines) {
    const line = raw.replace(LABEL, '').trim().replace(POS_PREFIX, '').replace(/[（(][^）)]*[）)]/g, '');
    for (const part of line.split(/[；;，,、\s]+/)) {
      const t = part.replace(/[^\p{Script=Han}]/gu, '');
      if (t && CJK.test(t)) terms.add(t);
      // 可疑的 → 可疑, 迅速地 → 迅速
      if (t.length >= 3 && /[的地]$/.test(t)) terms.add(t.slice(0, -1));
    }
  }
  return [...terms];
}

// A word's main senses: the first meaning line, up to four terms. Minor
// senses (e.g. bolt = 突然) make poor suggestions.
export function primaryTerms(lines) {
  const first = lines.find((l) => !/^\[/.test(l.trim())) ?? lines[0] ?? '';
  return meaningTerms([first]).slice(0, 4);
}

export function createWordlist(data) {
  const words = data.words;
  const lemmaOf = new Map();
  for (const [lemma, entry] of Object.entries(words)) {
    lemmaOf.set(lemma, lemma);
    for (const f of entry.forms) if (!lemmaOf.has(f)) lemmaOf.set(f, lemma);
  }
  const termCache = new Map();
  const termsFor = (lemma) => {
    if (!termCache.has(lemma)) termCache.set(lemma, meaningTerms(words[lemma]?.zh ?? []));
    return termCache.get(lemma);
  };

  let reverse;
  const reverseIndex = () => {
    if (!reverse) {
      reverse = new Map();
      for (const [lemma, entry] of Object.entries(words)) {
        if (entry.rank && entry.rank <= BASIC_RANK) continue;
        for (const t of primaryTerms(entry.zh)) {
          if (t.length < 2 || t.length > 4) continue;
          if (!reverse.has(t)) reverse.set(t, []);
          reverse.get(t).push(lemma);
        }
      }
    }
    return reverse;
  };

  return {
    count: Object.keys(words).length,
    has: (lemma) => Object.hasOwn(words, String(lemma).toLowerCase()),
    entry: (lemma) => words[String(lemma).toLowerCase()] ?? null,
    lemmaFor: (form) => lemmaOf.get(String(form).toLowerCase()) ?? null,
    terms: termsFor,

    isFormOf(form, lemma) {
      const f = String(form).toLowerCase();
      const l = String(lemma).toLowerCase();
      return f === l || (words[l]?.forms ?? []).includes(f);
    },

    // Does the contextual gloss agree with one of the dictionary meanings?
    glossMatches(lemma, gloss) {
      const g = String(gloss).replace(/[^\p{Script=Han}]/gu, '');
      if (!g) return false;
      return termsFor(String(lemma).toLowerCase()).some((t) =>
        t === g || (t.length >= 2 && g.includes(t)) || (g.length >= 2 && t.includes(g)) || (g.length === 1 && t.length <= 2 && t.includes(g)));
    },

    // Phrases in the text that are a main sense of an IELTS word that is not too basic.
    suggest(text, { limit = 80, exclude = [] } = {}) {
      const skip = new Set(exclude);
      const found = [];
      for (const [term, lemmas] of reverseIndex()) {
        let count = 0;
        for (let i = text.indexOf(term); i !== -1; i = text.indexOf(term, i + term.length)) count += 1;
        if (!count) continue;
        for (const lemma of lemmas) if (!skip.has(lemma)) found.push({ anchor: term, lemma, count });
      }
      // Longer anchors are more specific; then the most frequent.
      found.sort((a, b) => b.anchor.length - a.anchor.length || b.count - a.count || a.lemma.localeCompare(b.lemma));
      const seen = new Set();
      return found.filter((s) => !seen.has(s.lemma) && seen.add(s.lemma)).slice(0, limit);
    },
  };
}
