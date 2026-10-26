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
