// Pilot helpers (docs/PILOT.md).
//   node scripts/pilot.mjs forms <day1|day7> [--seed P01] [--key]
//       Print a recall test form (or its answer key) as Markdown.
//       Item order within each part is shuffled per seed (participant code).
//   node scripts/pilot.mjs summary <folder> [--out results.csv]
//       Summarize participants' exported progress files into one CSV.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../app/store.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const BLANK = '______';

/* ---------- Forms ---------- */

function seededRandom(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffled(list, seed) {
  const out = [...list];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const hint = (word) => `${word[0]}${'_'.repeat(Math.max(word.length - 1, 1))}`;

export function buildForm(bank, vocab, { day, seed = 'default', key = false }) {
  if (day !== 'day1' && day !== 'day7') throw new Error('day must be day1 or day7');
  const lemmaOf = (item) => item.lemma ?? vocab.find((w) => w.id === item.id)?.lemma;
  const items = bank.items.map((item) => ({ ...item, lemma: lemmaOf(item) }));
  const title = day === 'day1' ? '第 1 天' : '第 7 天';
  const lines = [`# cliffword 单词测试 · ${title}${key ? ' · 答案' : ''}`, ''];
  if (!key) {
    lines.push('参与者编号：________　　日期：________', '', '请按顺序做 A、B、C 三部分，做完一部分再翻下一页，不要回头修改。测试时请关闭 cliffword。', '');
  } else {
    lines.push(`顺序种子：${seed}。评分规则见 docs/PILOT.md。`, '');
  }

  lines.push('## A. 写出英文单词', '', key ? '' : '根据中文意思和首字母，写出英文单词（原形）。', '');
  shuffled(items, `${seed}:A`).forEach((item, n) => {
    lines.push(key ? `${n + 1}. ${item.prompt} → **${item.lemma}**` : `${n + 1}. ${item.prompt}（${hint(item.lemma)}）　________________`);
  });
  lines.push('', key ? '' : '<div style="page-break-after: always"></div>', '');

  lines.push('## B. 句子填空', '', key ? '' : '在英文句子里填入合适的单词，首字母已给出。注意单词的形式。', '');
  shuffled(items, `${seed}:B`).forEach((item, n) => {
    const { sentence, answer } = item[day];
    lines.push(key ? `${n + 1}. ${sentence.replace(BLANK, `**${answer}**`)}` : `${n + 1}. ${sentence.replace(BLANK, `${answer[0]}${BLANK}`)}`);
  });
  lines.push('', key ? '' : '<div style="page-break-after: always"></div>', '');

  lines.push('## C. 写出中文意思', '', key ? '' : '写出每个英文单词的中文意思。', '');
  shuffled(items, `${seed}:C`).forEach((item, n) => {
    lines.push(key ? `${n + 1}. ${item.lemma} → ${item.accept.join(' / ')}` : `${n + 1}. ${item.lemma}　________________`);
  });
  if (key) {
    lines.push('', '## 对照词', '', `以下单词不在 cliffword 里：${items.filter((i) => i.group === 'control').map((i) => i.lemma).join('、')}。`);
  }
  return `${lines.filter((l, i, all) => !(l === '' && all[i - 1] === '')).join('\n').trim()}\n`;
}

/* ---------- Export summary ---------- */

const COLUMNS = ['participant', 'exportedAt', 'days', 'chapters', 'nextChapter', 'answered', 'correct', 'accuracy', 'reviews', 'saved', 'firstDay', 'lastDay'];

export async function summarizeExports(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const rows = [];
  const problems = [];
  for (const file of files) {
    try {
      const text = await readFile(join(dir, file), 'utf8');
      const exportedAt = JSON.parse(text).exportedAt;
      const at = exportedAt ? Date.parse(exportedAt) : Date.now();
      const store = createStore(null, () => at);
      store.importJSON(text);
      const sum = store.summary();
      const days = [...store.data.stats.days].sort();
      rows.push({
        participant: basename(file, '.json'),
        exportedAt: exportedAt ?? '',
        days: sum.days,
        chapters: sum.chapters,
        nextChapter: sum.nextChapter,
        answered: sum.answered,
        correct: sum.correct,
        accuracy: sum.answered ? sum.correct / sum.answered : null,
        reviews: Object.values(store.data.answers).flat().filter((a) => String(a.mode).startsWith('review:')).length,
        saved: Object.keys(store.data.saved).length,
        firstDay: days[0] ?? '',
        lastDay: days.at(-1) ?? '',
      });
    } catch (err) {
      problems.push({ file, error: err.message });
    }
  }
  return { rows, problems };
}

export function toCSV(rows) {
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' && !Number.isInteger(v)) return v.toFixed(2);
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))].join('\n');
}

/* ---------- CLI ---------- */

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, arg, ...rest] = process.argv.slice(2);
  const opt = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? undefined : rest[i + 1];
  };
  try {
    if (command === 'forms') {
      const bank = JSON.parse(await readFile(join(root, 'docs/pilot/recall-items.json'), 'utf8'));
      const vocab = JSON.parse(await readFile(join(root, `content/${bank.story}/vocab.json`), 'utf8')).words;
      process.stdout.write(buildForm(bank, vocab, { day: arg, seed: opt('seed'), key: rest.includes('--key') }));
    } else if (command === 'summary' && arg) {
      const { rows, problems } = await summarizeExports(resolve(arg));
      const csv = `${toCSV(rows)}\n`;
      const out = opt('out');
      if (out) await writeFile(out, csv);
      else process.stdout.write(csv);
      for (const p of problems) console.error(`skipped ${p.file}: ${p.error}`);
      console.error(`${rows.length} participant file(s) summarized${out ? ` into ${out}` : ''}.`);
    } else {
      console.error('Usage:\n  npm run pilot:forms -- <day1|day7> [--seed P01] [--key]\n  npm run pilot:summary -- <folder> [--out results.csv]');
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
