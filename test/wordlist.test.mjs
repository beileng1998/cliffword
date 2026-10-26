import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWordlist, meaningTerms } from '../scripts/lib/wordlist.mjs';
import { parseCSV, formsFrom, meaningsFrom, buildWordlist, normalizeIPA } from '../scripts/build-wordlist.mjs';

const list = createWordlist({ words: {
  shelter: { ipa: '/ˈʃeltə/', zh: ['n. 庇护；避难所；遮蔽物', 'vt. 保护；使掩蔽'], forms: ['sheltered', 'sheltering', 'shelters'], rank: 4000 },
  flee: { ipa: '/fliː/', zh: ['vi. 逃走；逃跑；逃避'], forms: ['fled', 'fleeing', 'flees'], rank: 5000 },
  evidence: { ipa: '/ˈevɪdəns/', zh: ['n. 证据，证明；迹象'], forms: ['evidenced'], rank: 3000 },
  suspicious: { ipa: '/səˈspɪʃəs/', zh: ['a. 可疑的, 怀疑的'], forms: [], rank: 6000 },
  bolt: { ipa: '/bəʊlt/', zh: ['n. 门闩, 螺钉', 'vt. 闩住, 突然'], forms: [], rank: 7000 },
  day: { ipa: '/deɪ/', zh: ['n. 天, 白天'], forms: [], rank: 80 },
} });

test('meaning terms drop part-of-speech labels and brackets', () => {
  assert.deepEqual(meaningTerms(['n. 庇护；避难所（尤指）；遮蔽物', '[网络] 庇护所']), ['庇护', '避难所', '遮蔽物', '庇护所']);
});

test('looks up lemmas, forms and membership', () => {
  assert.equal(list.has('Shelter'), true);
  assert.equal(list.has('scholar'), false);
  assert.equal(list.lemmaFor('fled'), 'flee');
  assert.equal(list.isFormOf('fled', 'flee'), true);
  assert.equal(list.isFormOf('flown', 'flee'), false);
});

test('a gloss matches when it agrees with a dictionary meaning', () => {
  assert.equal(list.glossMatches('flee', '逃'), true, 'single character inside a 2-character meaning');
  assert.equal(list.glossMatches('flee', '逃跑'), true);
  assert.equal(list.glossMatches('evidence', '证据'), true);
  assert.equal(list.glossMatches('shelter', '避难所'), true);
  assert.equal(list.glossMatches('shelter', '容身之处'), false, 'contextual meaning needs a note');
  assert.equal(list.glossMatches('evidence', '苹果'), false);
});

test('suggests IELTS words whose meanings appear in a chapter, longest anchors first', () => {
  const s = list.suggest('他没有证据，只好逃跑。后来他找到一个避难所。');
  assert.deepEqual(s.map((x) => x.lemma), ['shelter', 'evidence', 'flee']);
  assert.equal(s.find((x) => x.lemma === 'shelter').anchor, '避难所');
  assert.deepEqual(list.suggest('他逃跑了。', { exclude: ['flee'] }), []);
});

test('parses ECDICT CSV rows, forms and meanings', () => {
  const csv = 'word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio\n'
    + 'flee,fli:,"to run away","vi. 逃走\\nvt. 逃离",,3,1,"cet4 ielts",0,0,p:fled/d:fled/i:fleeing/3:flees,,\n'
    + 'apple,æpl,,n. 苹果,,,,zk,0,0,,,\n';
  const rows = [...parseCSV(csv)];
  assert.equal(rows.length, 3);
  assert.equal(rows[1][2], 'to run away');
  assert.deepEqual(formsFrom('p:fled/d:fled/i:fleeing/3:flees/0:flee/1:p'), ['fled', 'fleeing', 'flees']);
  assert.deepEqual(meaningsFrom('vi. 逃走\\nvt. 逃离'), ['vi. 逃走', 'vt. 逃离']);
  const words = buildWordlist(csv);
  assert.deepEqual(Object.keys(words), ['flee'], 'only ielts-tagged words');
  assert.equal(words.flee.ipa, '/fliː/');
});

test('ECDICT phonetics become standard IPA symbols', () => {
  assert.equal(normalizeIPA("'evid\u04d9ns"), 'ˈevidəns');
  assert.equal(normalizeIPA("ˌkɒmpen'seit"), 'ˌkɒmpenˈseit');
  assert.equal(normalizeIPA("gri:f"), 'griːf');
  assert.equal(normalizeIPA(",ʌndә'stænd"), 'ˌʌndəˈstænd');
});

test('the bundled IELTS list is complete enough to use', async () => {
  const { readFile } = await import('node:fs/promises');
  const data = JSON.parse(await readFile(new URL('../data/ielts.json', import.meta.url), 'utf8'));
  assert.ok(data.count > 4000, `only ${data.count} words`);
  const letters = new Set(Object.keys(data.words).map((w) => w[0]));
  for (const ch of 'abcdefghijklmnoprstuvwy') assert.ok(letters.has(ch), `no words starting with ${ch}`);
  const list = createWordlist(data);
  assert.ok(list.glossMatches('evidence', '证据'));
  assert.ok(list.isFormOf('fled', 'flee'));
  assert.ok(!/[\u04d9':]/.test(data.words.evidence.ipa), data.words.evidence.ipa);
});

test('suggestions skip basic words and minor senses, and match stems without 的', () => {
  const lemmas = list.suggest('白天他没有证据，突然觉得那人很可疑。').map((x) => x.lemma);
  assert.ok(lemmas.includes('suspicious'), 'matches 可疑 for 可疑的');
  assert.ok(lemmas.includes('evidence'));
  assert.ok(!lemmas.includes('day'), 'too common');
  assert.ok(!lemmas.includes('bolt'), '突然 is only a minor sense of bolt');
  assert.ok(list.glossMatches('bolt', '突然'), 'but the gloss check still accepts minor senses');
});
