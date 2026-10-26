import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildForm, summarizeExports, toCSV } from '../scripts/pilot.mjs';
import { createStore } from '../app/store.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));

const bank = await read('docs/pilot/recall-items.json');
const vocab = (await read('content/huapi/vocab.json')).words;
const story = await read('content/huapi/story.json');
const storyText = (await Promise.all(story.chapters.map((f) => read(`content/huapi/${f}`))))
  .flatMap((c) => c.paragraphs.flatMap((p) => p.segments.map((s) => (typeof s === 'string' ? s : s.form)))).join('');

const BLANK = '______';
const lemmaOf = (item) => item.lemma ?? vocab.find((w) => w.id === item.id)?.lemma;

test('the bank covers every target word in the story, and only those', () => {
  const targets = bank.items.filter((i) => i.group === 'target').map((i) => i.id).sort();
  assert.deepEqual(targets, vocab.map((w) => w.id).sort());
});

test('control words appear nowhere in the story or its vocab', () => {
  const controls = bank.items.filter((i) => i.group === 'control');
  assert.equal(controls.length, 10);
  for (const c of controls) {
    assert.ok(!vocab.some((w) => w.lemma === c.lemma), `${c.lemma} is in vocab.json`);
    assert.ok(!new RegExp(`\\b${c.lemma}`, 'i').test(storyText), `${c.lemma} is in the story`);
  }
});

test('every sentence has one blank, its answer is a form of the word, and Day 1 ≠ Day 7', () => {
  for (const item of bank.items) {
    const lemma = lemmaOf(item);
    assert.ok(lemma, `${item.id} has no lemma`);
    assert.ok(item.prompt && item.accept.length, `${item.id} needs a prompt and accepted meanings`);
    for (const day of ['day1', 'day7']) {
      const { sentence, answer } = item[day];
      assert.equal(sentence.split(BLANK).length, 2, `${item.id} ${day}: exactly one blank`);
      assert.equal(answer[0].toLowerCase(), lemma[0].toLowerCase(), `${item.id} ${day}: answer "${answer}" vs lemma "${lemma}"`);
    }
    assert.notEqual(item.day1.sentence, item.day7.sentence, `${item.id}: same sentence on both days`);
  }
});

test('no test sentence is an app example or a story sentence', () => {
  const examples = vocab.map((w) => w.example.toLowerCase());
  for (const item of bank.items) {
    for (const day of ['day1', 'day7']) {
      const filled = item[day].sentence.replace(BLANK, item[day].answer).toLowerCase();
      assert.ok(!examples.includes(filled), `${item.id} ${day} repeats the vocab example`);
      assert.ok(!storyText.toLowerCase().includes(filled), `${item.id} ${day} is in the story`);
    }
  }
});

test('a form has parts A, B and C, the right day sentences, and a stable shuffle per seed', () => {
  const form = buildForm(bank, vocab, { day: 'day7', seed: 'P03' });
  assert.match(form, /## A\. /);
  assert.match(form, /## B\. /);
  assert.match(form, /## C\. /);
  assert.ok(form.indexOf('## A.') < form.indexOf('## B.') && form.indexOf('## B.') < form.indexOf('## C.'));
  // Part B shows the blank with the answer's first letter.
  assert.ok(form.includes('As a young s______, she read every book in the library.'));
  assert.ok(!form.includes('The old s______ spent'), 'no Day 1 sentence in a Day 7 form');
  assert.equal(form, buildForm(bank, vocab, { day: 'day7', seed: 'P03' }));
  assert.notEqual(form, buildForm(bank, vocab, { day: 'day7', seed: 'P04' }));
  // Part A must not show English words; Part C shows them.
  const partA = form.slice(form.indexOf('## A.'), form.indexOf('## B.'));
  assert.ok(!/\bscholar\b/.test(partA));
  assert.match(form.slice(form.indexOf('## C.')), /\bscholar\b/);
});

test('the answer key lists answers for every part', () => {
  const key = buildForm(bank, vocab, { day: 'day1', seed: 'P01', key: true });
  assert.match(key, /scholar/);
  assert.match(key, /书生 \/ 学者 \/ 读书人/);
});

function exportFor(setup) {
  let t = new Date(2026, 9, 25, 10).getTime();
  const map = new Map();
  const storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
  const store = createStore(storage, () => t);
  setup(store, (ms) => { t = ms; });
  return store.exportJSON();
}

test('summarizes a folder of exports into one row per participant code', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pilot-'));
  await writeFile(join(dir, 'P01.json'), exportFor((s, at) => {
    s.noteVisit();
    s.markComplete('builtin/huapi', '01');
    s.noteNextChapter('builtin/huapi');
    s.recordAnswer('builtin/huapi/scholar-n', { mode: 'en2zh', correct: false, given: 'x' }, { lemma: 'scholar', form: 'scholar', gloss: '书生' });
    s.toggleSaved('builtin/huapi/dawn-n', { lemma: 'dawn', form: 'dawn', gloss: '天刚亮' });
    at(new Date(2026, 9, 27, 9).getTime());
    s.noteVisit();
    s.reviewResult('builtin/huapi/scholar-n', true, 'en2zh', '书生');
  }));
  await writeFile(join(dir, 'P02.json'), exportFor((s) => s.noteVisit()));
  await writeFile(join(dir, 'notes.txt'), 'ignored');
  await writeFile(join(dir, 'P09.json'), '{ broken');

  const { rows, problems } = await summarizeExports(dir);
  assert.deepEqual(rows.map((r) => r.participant), ['P01', 'P02']);
  assert.deepEqual(problems.map((p) => p.file), ['P09.json']);
  const p1 = rows[0];
  assert.equal(p1.days, 2);
  assert.equal(p1.chapters, 1);
  assert.equal(p1.nextChapter, 1);
  assert.equal(p1.answered, 2);
  assert.equal(p1.correct, 1);
  assert.equal(p1.reviews, 1);
  assert.equal(p1.saved, 1);
  assert.equal(p1.firstDay, '2026-10-25');
  assert.equal(p1.lastDay, '2026-10-27');

  const csv = toCSV(rows);
  assert.equal(csv.split('\n')[0], 'participant,exportedAt,days,chapters,nextChapter,answered,correct,accuracy,reviews,saved,firstDay,lastDay');
  assert.match(csv, /^P01,.*,2,1,1,2,1,0\.50,1,1,2026-10-25,2026-10-27$/m);
});
