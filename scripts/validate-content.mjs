// Validates story content against the rules in docs/CONTENT.md.
// Usage: node scripts/validate-content.mjs [content-dir]
//        node scripts/validate-content.mjs library --library
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAnnotations, splitParagraphs } from './lib/annotate.mjs';

const DEFAULTS = { minWords: 30, maxWords: 50, minOccurrences: 2, requireHook: true, perChapter: null };
// Imported books: no total word range and no hook markup, but a per-chapter density.
const BOOK_DEFAULTS = { minWords: 0, maxWords: Infinity, requireHook: false, perChapter: { min: 8, max: 15 } };
const ENGLISH_FORM = /^[A-Za-z][A-Za-z' -]*$/;

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function loadStory(dir) {
  const story = await readJson(join(dir, 'story.json'));
  const vocab = await readJson(join(dir, 'vocab.json'));
  const chapters = [];
  for (const file of story.chapters ?? []) chapters.push(await readJson(join(dir, file)));
  return { story, vocab, chapters };
}

function containsWord(sentence, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(sentence);
}

export function validateStoryData({ story, vocab, chapters }, options = {}) {
  const { minWords, maxWords, minOccurrences, requireHook, perChapter } = { ...DEFAULTS, ...options };
  const errors = [];
  const words = new Map();

  if (!story.id) errors.push('story.json: missing id');
  if (!story.title) errors.push('story.json: missing title');
  if (!chapters.length) errors.push('story.json: no chapters');

  for (const word of vocab.words ?? []) {
    const at = `vocab "${word.id}"`;
    if (!word.id) { errors.push('vocab: entry without id'); continue; }
    if (words.has(word.id)) errors.push(`duplicate vocab id "${word.id}"`);
    words.set(word.id, word);
    for (const field of ['lemma', 'ipa', 'pos', 'example']) {
      if (!word[field]) errors.push(`${at}: missing ${field}`);
    }
  }

  const occurrences = new Map();
  for (const chapter of chapters) {
    const at = `chapter "${chapter.id}"`;
    const paragraphs = chapter.paragraphs ?? [];
    if (!paragraphs.length) errors.push(`${at}: no paragraphs`);
    else if (requireHook && paragraphs.at(-1).hook !== true) errors.push(`${at}: last paragraph must be marked "hook": true`);

    const inChapter = new Set();
    paragraphs.forEach((paragraph, p) => {
      for (const seg of paragraph.segments ?? []) {
        if (typeof seg === 'string') continue;
        const where = `${at} paragraph ${p + 1}`;
        if (!words.has(seg.w)) { errors.push(`${where}: unknown vocab id "${seg.w}"`); continue; }
        if (!seg.form || !ENGLISH_FORM.test(seg.form)) errors.push(`${where}: "${seg.w}" has invalid form "${seg.form ?? ''}"`);
        if (!seg.gloss) errors.push(`${where}: "${seg.w}" missing gloss`);
        if (seg.accept !== undefined && (!Array.isArray(seg.accept) || !seg.accept.length)) {
          errors.push(`${where}: "${seg.w}" accept must be a non-empty list`);
        }
        const list = occurrences.get(seg.w) ?? [];
        list.push(seg);
        occurrences.set(seg.w, list);
        inChapter.add(seg.w);
      }
    });
    if (perChapter && (inChapter.size < perChapter.min || inChapter.size > perChapter.max)) {
      errors.push(`${at} uses ${inChapter.size} target words, expected ${perChapter.min}–${perChapter.max}`);
    }
  }

  for (const [id, word] of words) {
    const found = occurrences.get(id) ?? [];
    if (!found.length) { errors.push(`vocab "${id}" never occurs in the story`); continue; }
    if (found.length < minOccurrences) {
      errors.push(`vocab "${id}" occurs ${found.length} time(s), expected at least ${minOccurrences}`);
    }
    const forms = new Set([word.lemma, ...found.map((s) => s.form)].filter(Boolean));
    if (word.example && ![...forms].some((f) => containsWord(word.example, f))) {
      errors.push(`vocab "${id}": example "${word.example}" does not contain the word`);
    }
  }

  const used = [...occurrences.keys()].filter((id) => words.has(id)).length;
  if (used < minWords || used > maxWords) {
    errors.push(`story uses ${used} target words, expected ${minWords}–${maxWords}`);
  }
  return errors;
}

// An imported book: book.json, vocab.json, untouched source/NNN.txt and the
// agent-written annotations/NNN.json. Chapters are assembled in memory.
export async function loadBook(dir) {
  const book = await readJson(join(dir, 'book.json'));
  const vocab = await readJson(join(dir, 'vocab.json')).catch(() => ({ words: [] }));
  const chapters = [];
  const errors = [];
  for (const { id, title } of book.chapters ?? []) {
    const source = await readFile(join(dir, 'source', `${id}.txt`), 'utf8');
    const annotations = await readJson(join(dir, 'annotations', `${id}.json`)).catch(() => null);
    if (!annotations) errors.push(`chapter "${id}" is not annotated yet`);
    const built = applyAnnotations(splitParagraphs(source), annotations?.occurrences ?? []);
    errors.push(...built.errors.map((e) => `chapter "${id}": ${e}`));
    chapters.push({ id, title, paragraphs: built.paragraphs });
  }
  return { story: book, vocab, chapters, errors };
}

export async function validateBook(dir, options = {}) {
  const data = await loadBook(dir);
  const perChapter = options.perChapter ?? data.story.density ?? BOOK_DEFAULTS.perChapter;
  return [...data.errors, ...validateStoryData(data, { ...BOOK_DEFAULTS, ...options, perChapter })];
}

export async function validateAll(contentDir, options, { library = false } = {}) {
  const entries = await readdir(contentDir, { withFileTypes: true }).catch((err) => {
    if (err.code === 'ENOENT') return [];
    throw err;
  });
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(contentDir, entry.name);
    try {
      const errors = library ? await validateBook(dir, options) : validateStoryData(await loadStory(dir), options);
      results.push({ dir, errors });
    } catch (err) {
      results.push({ dir, errors: [`could not load: ${err.message}`] });
    }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const library = args.includes('--library');
  const contentDir = resolve(args.find((a) => !a.startsWith('--')) ?? (library ? 'library' : 'content'));
  const results = await validateAll(contentDir, {}, { library });
  if (!results.length) {
    console.error(`No stories found in ${contentDir}`);
    process.exit(1);
  }
  let failed = false;
  for (const { dir, errors } of results) {
    if (errors.length) {
      failed = true;
      console.error(`✗ ${dir}`);
      for (const e of errors) console.error(`  - ${e}`);
    } else {
      console.log(`✓ ${dir}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
