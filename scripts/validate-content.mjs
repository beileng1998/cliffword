// Validates story content against the rules in docs/CONTENT.md.
// Usage: node scripts/validate-content.mjs [content-dir]
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULTS = { minWords: 30, maxWords: 50, minOccurrences: 2 };
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
  const { minWords, maxWords, minOccurrences } = { ...DEFAULTS, ...options };
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
    else if (paragraphs.at(-1).hook !== true) errors.push(`${at}: last paragraph must be marked "hook": true`);

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
      }
    });
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

export async function validateAll(contentDir, options) {
  const entries = await readdir(contentDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(contentDir, entry.name);
    try {
      results.push({ dir, errors: validateStoryData(await loadStory(dir), options) });
    } catch (err) {
      results.push({ dir, errors: [`could not load: ${err.message}`] });
    }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const contentDir = resolve(process.argv[2] ?? 'content');
  const results = await validateAll(contentDir);
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
