import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { splitChapters, decodeText, importText } from '../scripts/import-text.mjs';
import { applyAnnotations } from '../scripts/lib/annotate.mjs';
import { loadBook, validateBook } from '../scripts/validate-content.mjs';

const tmp = () => mkdtemp(join(tmpdir(), 'cliffword-'));

test('splits on Chinese chapter headings', () => {
  const chapters = splitChapters('第一章 开始\n他来了。\n\n第二章 结束\n他走了。\n');
  assert.deepEqual(chapters.map((c) => c.title), ['第一章 开始', '第二章 结束']);
  assert.equal(chapters[1].text, '他走了。');
});

test('keeps a long preface as its own chapter', () => {
  const preface = '序'.repeat(300);
  const chapters = splitChapters(`${preface}\n第1章 正文\n内容。`);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].title, '序');
});

test('chunks text without headings into parts at paragraph boundaries', () => {
  const para = '字'.repeat(1000);
  const chapters = splitChapters(Array(7).fill(para).join('\n'));
  assert.equal(chapters.length, 3);
  assert.equal(chapters[0].title, '第1部分');
  assert.ok(chapters.every((c) => !c.text.includes('字'.repeat(1001))));
});

test('decodes GB18030 text when it is not valid UTF-8', () => {
  const gbk = Buffer.from([0xc4, 0xe3, 0xba, 0xc3]); // 你好
  assert.equal(decodeText(gbk), '你好');
  assert.equal(decodeText(Buffer.from('﻿你好', 'utf8')), '你好');
});

test('refuses URLs: import only reads local files', async () => {
  await assert.rejects(importText('https://example.com/book/1', { libraryDir: await tmp() }), /local text file/);
});

test('writes source chapters and book.json, and will not overwrite', async () => {
  const dir = await tmp();
  const file = join(dir, 'book.txt');
  await writeFile(file, '第一章 甲\n一。\n第二章 乙\n二。\n');
  const lib = join(dir, 'library');
  const { bookDir } = await importText(file, { id: 'my-book', libraryDir: lib });
  const book = JSON.parse(await readFile(join(bookDir, 'book.json'), 'utf8'));
  assert.equal(book.chapters.length, 2);
  assert.deepEqual(book.density, { min: 8, max: 15 });
  assert.equal(book.level, 'IELTS');
  assert.equal(await readFile(join(bookDir, 'source', '002.txt'), 'utf8'), '二。\n');
  await assert.rejects(importText(file, { id: 'my-book', libraryDir: lib }), /already exists/);
});

test('applies anchors in order and honours nth', () => {
  const { paragraphs, errors } = applyAnnotations(['证据就是证据。', '没有证据。'], [
    { w: 'evidence-n', anchor: '证据', nth: 2, form: 'evidence', gloss: '证据' },
    { w: 'evidence-n', anchor: '证据', nth: 3, form: 'evidence', gloss: '证据' },
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(paragraphs[0].segments, ['证据就是', { w: 'evidence-n', form: 'evidence', gloss: '证据' }, '。']);
  assert.deepEqual(paragraphs[1].segments, ['没有', { w: 'evidence-n', form: 'evidence', gloss: '证据' }, '。']);
});

test('reports anchors that are missing or overlap', () => {
  const { errors } = applyAnnotations(['他怀疑她。'], [
    { w: 'a', anchor: '证据', form: 'evidence', gloss: '证据' },
    { w: 'b', anchor: '怀疑她', form: 'suspect', gloss: '怀疑' },
    { w: 'c', anchor: '疑', form: 'doubt', gloss: '疑' },
  ]);
  assert.ok(errors.some((e) => /anchor "证据" #1 not found/.test(e)));
  assert.ok(errors.some((e) => /overlaps/.test(e)));
});

async function annotatedBook(occurrencesPerChapter) {
  const dir = await tmp();
  const file = join(dir, 'b.txt');
  await writeFile(file, '第一章 甲\n苹果和香蕉。\n第二章 乙\n苹果和香蕉。\n');
  const { bookDir } = await importText(file, { id: 'b', libraryDir: join(dir, 'library') });
  await writeFile(join(bookDir, 'vocab.json'), JSON.stringify({ words: [
    { id: 'apple-n', lemma: 'apple', ipa: '/ˈæpl/', pos: 'n.', example: 'An apple a day.' },
    { id: 'banana-n', lemma: 'banana', ipa: '/bəˈnɑːnə/', pos: 'n.', example: 'A ripe banana.' },
  ] }));
  await mkdir(join(bookDir, 'annotations'));
  for (const [i, occ] of occurrencesPerChapter.entries()) {
    await writeFile(join(bookDir, 'annotations', `00${i + 1}.json`), JSON.stringify({ occurrences: occ }));
  }
  return bookDir;
}

const apple = { w: 'apple-n', anchor: '苹果', form: 'apple', gloss: '苹果' };
const banana = { w: 'banana-n', anchor: '香蕉', form: 'banana', gloss: '香蕉' };

test('validates an annotated book with its own density limits', async () => {
  const bookDir = await annotatedBook([[apple, banana], [apple, banana]]);
  assert.deepEqual(await validateBook(bookDir, { perChapter: { min: 1, max: 2 } }), []);
  const tooFew = await validateBook(bookDir);
  assert.ok(tooFew.some((e) => /chapter "001" uses 2 target words, expected 8–15/.test(e)));
});

test('reports chapters that are not annotated yet', async () => {
  const bookDir = await annotatedBook([[apple, banana]]);
  const errors = await validateBook(bookDir, { perChapter: { min: 1, max: 2 } });
  assert.ok(errors.some((e) => /chapter "002" is not annotated yet/.test(e)));
});

test('loadBook keeps the source text unchanged', async () => {
  const bookDir = await annotatedBook([[apple], [banana]]);
  const { chapters } = await loadBook(bookDir);
  const text = chapters[0].paragraphs[0].segments.map((s) => (typeof s === 'string' ? s : s.gloss)).join('');
  assert.equal(text, '苹果和香蕉。');
});
