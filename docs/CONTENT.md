# Content format

Each story is a folder in `content/`:

```
content/<story-id>/
  story.json
  vocab.json
  chapters/01.json, 02.json, …
```

All story text and word data is CC-BY-4.0. It must be original, or a new retelling of a public-domain source that `source` names.

## story.json

```json
{ "id": "huapi", "title": "画皮", "license": "CC-BY-4.0",
  "source": "A new retelling based on 《画皮》 from 蒲松龄《聊斋志异》 (public domain).",
  "level": "IELTS",
  "chapters": ["chapters/01.json", "chapters/02.json", "chapters/03.json"] }
```

`source` (where the story comes from) and `level` (the exam level the target words are aimed at) are optional.

## vocab.json

There is one entry per **sense**, so the ID includes the part of speech: `suspect-v` and `suspect-n` are separate words.

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable ID that occurrences point to. Never rename it once published, because learners' saved progress uses it. |
| `lemma` | yes | Dictionary form, e.g. `suspect`. |
| `ipa` | yes | Pronunciation, e.g. `/səˈspekt/`. |
| `pos` | yes | Part of speech: `n.`, `v.`, `adj.`, `adv.`, … |
| `example` | yes | A short, natural English sentence that is **not** from the story, containing the word. Used for the transfer exercise. |

## chapters/NN.json

```json
{
  "id": "01",
  "title": "门把手",
  "paragraphs": [
    { "segments": ["警察在门把手上找到了新的",
                   { "w": "evidence-n", "form": "evidence", "gloss": "证据" }, "。"] },
    { "segments": ["可是那天晚上，邻居家的灯一直没有亮。"], "hook": true }
  ]
}
```

A segment is either plain Chinese text or an **occurrence**:

| Field | Required | Meaning |
|---|---|---|
| `w` | yes | Vocab ID. |
| `form` | yes | The English as written here, which may be inflected (`suspected`). This is the answer for ZH→EN spelling. |
| `gloss` | yes | The Chinese meaning **in this sentence**. |
| `accept` | no | Other Chinese answers accepted for EN→ZH recall. Defaults to `[gloss]`. |

## Rules the validator enforces

Run `npm run validate`. It checks:

- Every occurrence points to an existing vocab ID, and every vocab entry occurs at least twice.
- A story uses 30–50 distinct target words.
- Every vocab entry has `lemma`, `ipa`, `pos` and an `example` that contains the word.
- Every occurrence has a `gloss` and an English `form`.
- The last paragraph of each chapter is marked `"hook": true`.

The validator can't check whether a gloss is *correct*, whether the story is good, or whether the target words are spread too densely. That needs a human reviewer.

## Imported books (`library/`, never committed)

`npm run import -- <file.txt>` reads a local UTF-8 or GBK/GB18030 text file and writes:

```
library/<book-id>/
  book.json            id, title, level ("IELTS"), density ({ "min": 8, "max": 15 }), chapters
  source/001.txt, …    the chapter text as it was, one paragraph per line
```

Chapters are split on headings such as `第一章`, `第12回`, `Chapter 3`, `序章` or `番外`. A file with no headings is split into parts of about 3,000 characters, at paragraph breaks. URLs are refused: import never downloads anything.

Your own agent then runs the `cliffword-annotate` skill, which writes two kinds of file and nothing else:

- `vocab.json`, in the same format as above;
- `annotations/001.json`, …, each listing which Chinese phrase becomes a target word:

```json
{ "occurrences": [
  { "w": "evidence-n", "anchor": "证据", "nth": 2, "form": "evidence", "gloss": "证据" }
] }
```

`anchor` must be an exact substring of that chapter's source text. `nth` (default 1) counts occurrences of the anchor across the whole chapter. The source text is never rewritten. Chapters are assembled in memory when they're validated or read.

`npm run validate:library` checks imported books with the same rules as built-in stories, with three changes:
- no total word range;
- no hook markup;
- each chapter must use `density.min`–`density.max` distinct target words.

It also reports anchors that aren't found or that overlap, and chapters that aren't annotated yet.
