// Answer checking for the recall modes. Pure functions, no DOM.

const ZH_NOISE = /[\s\p{P}\p{S}]/gu;

export function normalizeZh(text) {
  return String(text ?? '').replace(ZH_NOISE, '');
}

// EN→ZH: any accepted meaning (default: the contextual gloss) counts.
export function checkMeaning(answer, seg) {
  const given = normalizeZh(answer);
  if (!given) return false;
  return (seg.accept ?? [seg.gloss]).some((a) => normalizeZh(a) === given);
}

// ZH→EN: the form as it appears in the sentence, ignoring case.
export function checkSpelling(answer, seg) {
  return String(answer ?? '').trim().toLowerCase() === seg.form.toLowerCase();
}

// "suspected" → "s________": first letter, then one blank per letter.
export function hintFor(form) {
  return [...form].map((ch, i) => (i === 0 || !/\p{L}/u.test(ch) ? ch : '_')).join('');
}

// Transfer: blank the target word in the vocab entry's own English example.
export function transferPrompt(word, forms = []) {
  const candidates = [...new Set([...forms, word.lemma])].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const form of candidates) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`\\b${escaped}\\b`, 'i').exec(word.example ?? '');
    if (m) {
      return {
        before: word.example.slice(0, m.index),
        answer: m[0],
        after: word.example.slice(m.index + m[0].length),
      };
    }
  }
  return null;
}
