---
name: cliffword-annotate
description: Annotate a book the user imported into cliffword's local library/ with English target words (IELTS by default, 8–15 per chapter), writing only vocab.json and per-chapter annotation files, then validate. Use when the user asks to annotate, tag or prepare an imported book for cliffword, or names a book under library/.
---

# cliffword-annotate

You help the user read **their own local book** in cliffword. The book is already in `library/<book-id>/`, put there by `npm run import -- <file.txt>`. You add English target words by writing small annotation files. You never rewrite or copy the book's text.

## Boundaries (always)

- **Local files only.** Work only on `library/<book-id>/` as it exists. Never fetch, download, scrape or search for book text on the web, even if asked. If the book isn't imported yet, tell the user to run `npm run import -- <path-to-their-file.txt>` on a file they already have.
- **Never copy the text.** Don't write source text into any other file, and don't paste chapters into chat. In your replies, quote at most a short phrase to point at an anchor.
- **Never commit or share.** `library/` is gitignored. Don't `git add -f` it, move it into `content/`, or upload it anywhere.
- **Only write these files:** `library/<book-id>/vocab.json` and `library/<book-id>/annotations/<chapter-id>.json`. Leave `source/` and `book.json` alone. Changing `level` or `density` in `book.json` is the one exception, and only when the user asks.

## Inputs

- `library/<book-id>/book.json`: the chapter list, `level` (default `IELTS`) and `density` (default `{ "min": 8, "max": 15 }` distinct target words per chapter).
- `library/<book-id>/source/<chapter-id>.txt`: one paragraph per line. This file is read-only.

Ask which book if several exist and the user didn't say. Ask whether to do all chapters or a range if the book has more than about 20; offer the first 3 as a start.

## Output format

`vocab.json` has one entry per **sense**, the same as built-in stories (see `docs/CONTENT.md`):

```json
{ "words": [
  { "id": "evidence-n", "lemma": "evidence", "ipa": "/ˈevɪdəns/", "pos": "n.",
    "example": "There is no evidence that he was ever there." }
] }
```

`annotations/<chapter-id>.json` lists which Chinese phrase in the source becomes a target word:

```json
{ "occurrences": [
  { "w": "evidence-n", "anchor": "证据", "nth": 2, "form": "evidence", "gloss": "证据" }
] }
```

- `anchor`: an exact substring of the chapter's source text, which the English word replaces when displayed.
- `nth`: which occurrence of that anchor in the chapter, counting from 1 across the whole chapter. It defaults to 1.
- `form`: the English as it should read in that sentence; it can be inflected (`suspected`).
- `gloss`: the Chinese meaning *in this sentence*, usually the anchor itself or a cleaned-up version of it.
- `accept` (optional): other Chinese answers to accept in EN→ZH recall.

## Choosing words

1. Pick words at the book's `level`. IELTS means band 5.5–7.5 general and academic vocabulary: not basic words like *go* or *big*, and not rare literary words.
2. In each chapter, choose `density.min`–`density.max` distinct words, and tag each one at least once there.
3. Prefer words that come back: every vocab entry must occur **at least twice in the book**, ideally in different chapters, so reuse words from earlier chapters where they fit naturally.
4. Pick an anchor only where the English word reads naturally in that Chinese sentence and keeps the meaning. Skip names, idioms (成语) and anchors inside dialogue tags if swapping them would confuse.
5. Spread occurrences through the chapter rather than bunching them up. Never let anchors overlap.
6. `example` is a short, natural English sentence that you write yourself. It must not come from the book, and it must contain the lemma or one of the forms used.

## Loop

1. Read `book.json` and the source chapters in scope.
2. Write or extend `vocab.json`, then write `annotations/<chapter-id>.json` for each chapter.
3. Run `npm run validate:library` and fix every error. Common fixes:
   - `anchor … not found`: the anchor isn't an exact substring, or `nth` is too high;
   - `overlaps`: pick a different anchor;
   - `occurs 1 time(s)`: tag the word again somewhere, or drop it;
   - `uses N target words`: add or remove words in that chapter.

   Stop after 3 rounds if errors remain, and report them.
4. Report back with: the book, the chapters done, the number of words per chapter, the total number of distinct words, and any chapters skipped. Remind the user to spot-check glosses, since the validator checks structure, not meaning.
