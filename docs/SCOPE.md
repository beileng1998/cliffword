# cliffword — v0.1 scope

**One line:** original serialized Chinese stories with English target words woven in, plus recall exercises and next-day review, as a static web app.

**Who it's for:** Chinese-speaking learners preparing for English exams (CET-4/6, IELTS, 考研) who quit word lists but will keep reading a good story.

**The question v0.1 answers:** does story motivation turn into English vocabulary that is still there the next day and works outside the story? Engagement and learning are measured separately.

## In scope (v0.1)

- **Content:** 1 original storyline, 3 chapters, 30–50 target words. Each target word is tagged *where it appears* with a stable vocab ID, its form there, part of speech, its meaning in that context, accepted answers, and one short English example sentence. No global find-and-replace.
- **Reader:** library → chapter reader → word card (IPA, POS, contextual meaning, the original sentence, browser TTS, save).
- **Modes on the same passage:**
  - annotated reading;
  - EN→ZH meaning recall (English shown, gloss hidden);
  - ZH→EN spelling recall (gloss shown, English typed);
  - transfer: fill a target word into a new English sentence.
- **Learning state** in localStorage: reading position, saved words, answers, errors, review due dates. Next-day review of errors and saved words. JSON export and import.
- **Engagement signals**, kept local only: chapter completions, voluntary "next chapter" clicks, return-visit days. They can go into the export for a pilot, but are never sent anywhere.
- Works on mobile and desktop. No build step, no backend, no accounts, no AI at runtime.

## Non-goals

- Importing or auto-converting arbitrary books. [JiaduReader](https://github.com/qqw666666qqw/mixreader) already does that.
- Accounts, sync, payments, activation codes.
- Generating content with AI at runtime. AI may help draft offline, but every word is reviewed by a person before it ships.
- Reproducing or paraphrasing any commercial product's stories, names or branding. All stories are original.
- Claims of learning outcomes that a pilot can't support.

## Acceptance check (machine-runnable)

`npm test` passes. It runs:

1. **Content validator** (`node scripts/validate-content.mjs`): every occurrence references an existing vocab ID; the story has 30–50 distinct target words; each word has a POS, a contextual meaning, ≥1 accepted answer and an English example; each word appears in ≥2 chapters or ≥2 times; no orphan vocab entries; every chapter ends with a hook line, marked as such in the data.
2. **End-to-end test** (Playwright, run at 390×844 and 1280×800 viewports):
   1. Open the library and start chapter 1.
   2. Open a word card and save the word.
   3. In EN→ZH mode, answer one question wrong and one right.
   4. In ZH→EN mode, answer one question wrong.
   5. Reload: the reading position, saved word and errors are restored.
   6. Advance the clock by a day: the errors are due in review.
   7. Export, clear storage, import: the state matches.

## Content license

Code: MIT. Stories and word data: CC-BY-4.0.
