# Pilot materials

The plan is in [`../PILOT.md`](../PILOT.md). This folder holds what you hand out and score.

| File | What it is |
|---|---|
| `participant-guide.md` | Information sheet and consent text for participants, in Chinese. Fill in the blanks (URL, participant code, deletion date, contact) before sending. |
| `recall-items.json` | The 43 test items: 33 target words from 《画皮》 and 10 control words that appear nowhere in cliffword. Each has a Chinese prompt, the accepted meanings, and two new English sentences (Day 1 and Day 7). |

## Making the test forms

The item order inside each part is shuffled per participant code, and the same code always gives the same order:

```bash
npm run pilot:forms -- day1 --seed P03 > P03-day1.md
```

```bash
npm run pilot:forms -- day1 --seed P03 --key > P03-day1-key.md
```

Use `day1` for both the Day 0 pre-test (hand out Part A only) and the next-day test. Use `day7` for the one-week test. The Markdown prints as is, or can be pasted into a form tool. Put A, B and C on separate pages or form sections, so nobody can go back.

`npm test` checks the item bank:
- it covers every target word in the story, and the control words appear nowhere in it;
- each sentence has exactly one blank;
- each answer is a form of the right word;
- no sentence repeats the story or an app example;
- Day 1 and Day 7 never share a sentence.

## Summarizing the export files

Put the files participants send (`P01.json`, `P02.json`, …) in `pilot-data/`, which git ignores, or in any folder outside the repo:

```bash
npm run pilot:summary -- pilot-data --out pilot-data/summary.csv
```

This writes one row per participant: days, chapters, nextChapter, answered, correct, accuracy, reviews, saved, firstDay and lastDay. Files that can't be read are listed and skipped. **Never commit anything from `pilot-data/`.**
