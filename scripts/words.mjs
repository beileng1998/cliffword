// Word-list helpers for the cliffword-annotate skill. Output is compact
// JSON lines so an agent can read it cheaply.
//   npm run words -- suggest <book-id> <chapter-id> [--limit 60]
//       IELTS words whose dictionary meanings appear in that chapter's text.
//   npm run words -- lookup <word> [<word> …]
//       Pronunciation, Chinese meanings and forms for each word.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWordlist } from './validate-content.mjs';

const LIBRARY = fileURLToPath(new URL('../library', import.meta.url));

function brief(entry, lemma) {
  return { lemma, ipa: entry.ipa, zh: entry.zh.slice(0, 3).join(' | ') };
}

export async function suggestFor(bookDir, chapterId, { limit = 60, list } = {}) {
  const words = list ?? await loadWordlist();
  const text = await readFile(join(bookDir, 'source', `${chapterId}.txt`), 'utf8');
  const vocab = await readFile(join(bookDir, 'vocab.json'), 'utf8').then(JSON.parse, () => ({ words: [] }));
  const used = new Set(vocab.words.map((w) => w.lemma));
  return words.suggest(text, { limit }).map((s) => ({
    ...brief(words.entry(s.lemma), s.lemma),
    anchor: s.anchor,
    count: s.count,
    inBook: used.has(s.lemma),
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  const limitAt = args.indexOf('--limit');
  const limit = limitAt === -1 ? 60 : Number(args.splice(limitAt, 2)[1]);
  try {
    if (command === 'suggest' && args.length === 2) {
      const [bookId, chapterId] = args;
      for (const row of await suggestFor(join(LIBRARY, bookId), chapterId, { limit })) console.log(JSON.stringify(row));
    } else if (command === 'lookup' && args.length) {
      const list = await loadWordlist();
      for (const word of args) {
        const lemma = list.lemmaFor(word);
        const entry = lemma && list.entry(lemma);
        console.log(JSON.stringify(entry
          ? { word, lemma, ipa: entry.ipa, zh: entry.zh, forms: entry.forms }
          : { word, onList: false }));
      }
    } else {
      console.error('Usage:\n  npm run words -- suggest <book-id> <chapter-id> [--limit 60]\n  npm run words -- lookup <word> [<word> …]');
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
