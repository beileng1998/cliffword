import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, startOfDay, addDays, INTERVALS } from '../app/store.js';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 25, 10, 0).getTime(); // 25 Oct 2026, 10:00 local

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map };
}

function clockStore(storage = memoryStorage()) {
  let t = T0;
  const store = createStore(storage, () => t);
  return { store, storage, at: (ms) => { t = ms; } };
}

const meta = { lemma: 'scholar', form: 'scholar', gloss: '书生', bookTitle: '画皮', chapter: '01', p: 0, i: 1 };
const KEY = 'builtin/huapi/scholar-n';

test('a wrong answer is due from the start of the next day, not the same day', () => {
  const { store, at } = clockStore();
  store.recordAnswer(KEY, { mode: 'en2zh', correct: false, given: '学者' }, meta);
  assert.deepEqual(store.due(), []);
  at(addDays(T0, 1) - 1);
  assert.deepEqual(store.due(), []);
  at(addDays(T0, 1));
  assert.deepEqual(store.due().map((r) => r.key), [KEY]);
  assert.equal(store.due()[0].gloss, '书生');
});

test('a correct answer outside review does not schedule anything', () => {
  const { store, at } = clockStore();
  store.recordAnswer(KEY, { mode: 'en2zh', correct: true, given: '书生' }, meta);
  at(T0 + 5 * DAY);
  assert.deepEqual(store.due(), []);
});

test('saving schedules a review; unsaving removes it unless there were errors', () => {
  const { store, at } = clockStore();
  store.toggleSaved(KEY, meta);
  at(T0 + DAY);
  assert.equal(store.due().length, 1);
  store.toggleSaved(KEY);
  assert.equal(store.due().length, 0);

  store.recordAnswer(KEY, { mode: 'zh2en', correct: false, given: 'scolar' }, meta);
  store.toggleSaved(KEY, meta);
  store.toggleSaved(KEY);
  at(T0 + 2 * DAY);
  assert.equal(store.due().length, 1, 'still due because of the error');
});

test('correct reviews step through the intervals; a miss resets to tomorrow', () => {
  const { store, at } = clockStore();
  store.recordAnswer(KEY, { mode: 'en2zh', correct: false, given: 'x' }, meta);
  let day = addDays(T0, 1);
  for (const interval of INTERVALS.slice(1, 4)) {
    at(day + 9 * 60 * 60 * 1000);
    store.reviewResult(KEY, true, 'en2zh', 'ok');
    const next = store.data.reviews[KEY].dueAt;
    assert.equal(Math.round((next - day) / DAY), interval);
    day = next;
  }
  at(day + 1000);
  store.reviewResult(KEY, false, 'zh2en', 'bad');
  assert.equal(store.data.reviews[KEY].dueAt, addDays(day, 1));
  assert.equal(store.data.reviews[KEY].streak, 0);
  assert.equal(store.errors()[KEY].count, 2);
});

test('review direction alternates by streak', () => {
  const { store, at } = clockStore();
  store.recordAnswer(KEY, { mode: 'en2zh', correct: false, given: 'x' }, meta);
  at(T0 + DAY);
  assert.equal(store.due()[0].direction, 'en2zh');
  store.reviewResult(KEY, true, 'en2zh', 'ok');
  at(T0 + 10 * DAY);
  assert.equal(store.due()[0].direction, 'zh2en');
});

test('visit days are recorded once per local day', () => {
  const { store, at } = clockStore();
  store.noteVisit();
  at(T0 + 60 * 60 * 1000);
  store.noteVisit();
  at(T0 + DAY);
  store.noteVisit();
  assert.deepEqual(store.data.stats.days, ['2026-10-25', '2026-10-26']);
});

test('chapter completion is recorded once', () => {
  const { store } = clockStore();
  store.markComplete('builtin/huapi', '01');
  store.markComplete('builtin/huapi', '01');
  store.markComplete('builtin/huapi', '02');
  assert.deepEqual(store.data.stats.completed['builtin/huapi'], ['01', '02']);
});

test('summary counts days, chapters, next-chapter clicks, accuracy and due words', () => {
  const { store, at } = clockStore();
  store.noteVisit();
  store.markComplete('builtin/huapi', '01');
  store.noteNextChapter('builtin/huapi');
  store.recordAnswer(KEY, { mode: 'en2zh', correct: false, given: 'x' }, meta);
  store.recordAnswer('builtin/huapi/dawn-n', { mode: 'en2zh', correct: true, given: '天刚亮' }, meta);
  at(T0 + DAY);
  store.noteVisit();
  assert.deepEqual(store.summary(), {
    days: 2, chapters: 1, nextChapter: 1, answered: 2, correct: 1, due: 1, upcoming: 0,
  });
});

test('export and import round-trip the whole state', () => {
  const { store } = clockStore();
  store.toggleSaved(KEY, meta);
  store.recordAnswer(KEY, { mode: 'en2zh', correct: false, given: '学者' }, meta);
  store.setPosition('builtin/huapi', { chapter: '02', chapterNumber: 2, paragraph: 4 });
  const json = store.exportJSON();
  const parsed = JSON.parse(json);
  assert.equal(parsed.app, 'cliffword');
  assert.equal(parsed.version, 1);

  const other = createStore(memoryStorage(), () => T0);
  other.importJSON(json);
  assert.deepEqual(other.data, store.data);
  assert.equal(other.isSaved(KEY), true);
});

test('export never contains paragraph text, only word-level fields', () => {
  const { store } = clockStore();
  store.recordAnswer(KEY, { mode: 'en2zh', correct: false, given: '学者' }, { ...meta, context: '太原有个书生，姓王。' });
  const json = store.exportJSON();
  assert.ok(!json.includes('太原有个'), 'context text must not be stored');
  assert.ok(!('context' in store.data.reviews[KEY]));
});

test('import rejects files that are not cliffword backups and keeps current state', () => {
  const { store } = clockStore();
  store.toggleSaved(KEY, meta);
  assert.throws(() => store.importJSON('not json'), /不是有效的/);
  assert.throws(() => store.importJSON(JSON.stringify({ app: 'other', version: 1, data: {} })), /不是 cliffword/);
  assert.throws(() => store.importJSON(JSON.stringify({ app: 'cliffword', version: 99, data: {} })), /版本/);
  assert.equal(store.isSaved(KEY), true);
});

test('isEmpty reflects whether there is anything to lose', () => {
  const { store } = clockStore();
  assert.equal(store.isEmpty(), true);
  store.toggleSaved(KEY, meta);
  assert.equal(store.isEmpty(), false);
});
