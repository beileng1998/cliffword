// Learning state in localStorage. Every read and write is guarded: in a
// private window or with blocked storage the app keeps working in memory.

const KEY = 'cliffword:v1';
const empty = () => ({ version: 1, saved: {}, positions: {}, answers: {}, errors: {}, stats: { nextChapter: {} } });

export function createStore(storage = globalThis.localStorage, now = () => Date.now()) {
  let persistent = true;
  let data = empty();
  try {
    const raw = storage?.getItem(KEY);
    if (raw) data = { ...empty(), ...JSON.parse(raw) };
  } catch {
    persistent = false;
  }

  function save() {
    try {
      storage?.setItem(KEY, JSON.stringify(data));
    } catch {
      persistent = false;
    }
  }

  return {
    get data() { return data; },
    get persistent() { return persistent; },

    isSaved: (wordKey) => Boolean(data.saved[wordKey]),
    // meta: what the 生词本 list shows (lemma, gloss, book title, …).
    toggleSaved(wordKey, meta = {}) {
      if (data.saved[wordKey]) delete data.saved[wordKey];
      else data.saved[wordKey] = { ...meta, savedAt: now() };
      save();
      return Boolean(data.saved[wordKey]);
    },
    saved: () => data.saved,

    position: (bookKey) => data.positions[bookKey] ?? null,
    setPosition(bookKey, pos) {
      data.positions[bookKey] = { ...pos };
      save();
    },

    answers: (wordKey) => data.answers[wordKey] ?? [],
    recordAnswer(wordKey, { mode, correct, given }) {
      (data.answers[wordKey] ??= []).push({ mode, correct, given, at: now() });
      if (!correct) {
        const e = (data.errors[wordKey] ??= { count: 0 });
        e.count += 1;
        e.lastAt = now();
      }
      save();
    },
    errors: () => data.errors,

    noteNextChapter(bookKey) {
      data.stats.nextChapter[bookKey] = (data.stats.nextChapter[bookKey] ?? 0) + 1;
      save();
    },
  };
}
