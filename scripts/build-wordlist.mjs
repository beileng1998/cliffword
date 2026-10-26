// Builds data/ielts.json from ECDICT (https://github.com/skywind3000/ECDICT, MIT).
// Keeps only words tagged "ielts", with pronunciation, Chinese meanings and
// word forms. Run once when updating; the result is committed.
// Usage: node scripts/build-wordlist.mjs <path/to/ecdict.csv> <ecdict-commit-sha>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../data/ielts.json', import.meta.url));

// RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines.
export function* parseCSV(text) {
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      yield row;
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); yield row; }
}

// ECDICT exchange: "p:fled/d:fled/i:fleeing/3:flees". Types 0 and 1 describe
// the lemma itself, not other forms.
export function formsFrom(exchange) {
  return [...new Set(String(exchange || '').split('/')
    .map((part) => part.split(':'))
    .filter(([type, value]) => value && type !== '0' && type !== '1')
    .map(([, value]) => value.trim().toLowerCase()))];
}

// ECDICT stores line breaks inside translation as the two characters "\n".
export function meaningsFrom(translation) {
  return String(translation || '').split(/\\n|\n/).map((l) => l.trim()).filter(Boolean);
}

// ECDICT uses ASCII stand-ins: ' and , for stress, : for length, and a
// Cyrillic ә for schwa. Map them to standard IPA symbols.
export function normalizeIPA(phonetic) {
  return String(phonetic || '')
    .replace(/'/g, 'ˈ')
    .replace(/,/g, 'ˌ')
    .replace(/:/g, 'ː')
    .replace(/ә/g, 'ə')
    .replace(/Ә/g, 'ə')
    .trim();
}

export function rankFrom(bnc, frq) {
  const ranks = [Number(bnc), Number(frq)].filter((n) => Number.isFinite(n) && n > 0);
  return ranks.length ? Math.min(...ranks) : 0;
}

export function buildWordlist(csvText) {
  const rows = parseCSV(csvText);
  const header = rows.next().value;
  const col = Object.fromEntries(header.map((name, i) => [name, i]));
  const words = {};
  for (const row of rows) {
    const tags = (row[col.tag] ?? '').split(/\s+/);
    if (!tags.includes('ielts')) continue;
    const word = row[col.word]?.trim().toLowerCase();
    if (!word || !/^[a-z][a-z' -]*$/.test(word)) continue;
    words[word] = {
      ipa: row[col.phonetic] ? `/${normalizeIPA(row[col.phonetic])}/` : '',
      zh: meaningsFrom(row[col.translation]),
      forms: formsFrom(row[col.exchange]),
      // Frequency rank (lower = more common), from BNC or the contemporary
      // corpus, whichever ranks it more common; 0 when unknown.
      rank: rankFrom(row[col.bnc], row[col.frq]),
    };
  }
  return words;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [csvPath, commit] = process.argv.slice(2);
  if (!csvPath || !commit) {
    console.error('Usage: node scripts/build-wordlist.mjs <ecdict.csv> <ecdict-commit-sha>');
    process.exit(1);
  }
  const words = buildWordlist(await readFile(csvPath, 'utf8'));
  const sorted = Object.fromEntries(Object.entries(words).sort(([a], [b]) => a.localeCompare(b)));
  const out = {
    about: 'IELTS-tagged words from ECDICT with pronunciation, Chinese meanings and word forms. Used by the library validator and the cliffword-annotate skill.',
    source: `https://github.com/skywind3000/ECDICT/tree/${commit}`,
    license: 'MIT (see data/ECDICT-LICENSE)',
    count: Object.keys(sorted).length,
    words: sorted,
  };
  await mkdir(fileURLToPath(new URL('../data', import.meta.url)), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(out)}\n`);
  console.log(`${out.count} IELTS words written to ${OUT}`);
}
