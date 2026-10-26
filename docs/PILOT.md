# cliffword v0.1 pilot plan

**Status: draft.** The thresholds and the recruiting route are proposals for the maintainer to confirm before recruiting starts.

## What the pilot can and can't tell us

A small pilot answers three practical questions:

1. **Usability.** Can learners read a chapter, open word cards, answer in both directions and fix mistakes, on their own phone or laptop, without help?
2. **Engagement.** Do they choose to keep reading (chapters 2 and 3) and come back on later days, without being told to?
3. **A learning signal.** A day and a week later, can they recall the story's words better than matched words they never studied, including in English sentences they haven't seen?

It **can't** show that cliffword works better than flashcards or anything else. With about 10 people, no control group and an unblinded design, every number is descriptive. Report it that way and don't claim more.

## Participants

| | Proposal |
|---|---|
| Number | 8–12 people. At least 5 are enough to find most usability problems; 10–12 leave a margin for dropouts. |
| Who | Adults (18+) whose first language is Chinese, currently preparing for IELTS (target band 5.5–7), CET-6 or 考研 English. Fluent readers of Chinese. |
| Exclude | Anyone who already knows most of the target words: more than 20 of the 33 correct on the pre-test's ZH→EN part. The story would teach them little, and their scores would hide everyone else's. |
| Device | Their own phone or laptop with a recent Chrome, Safari or Edge. Record which, because speech voices differ by device. |
| Recruiting | Study groups, classmates or friends of friends. Avoid direct reports or students you grade, so no one feels obliged to join or to praise it. |
| Minors | Not in this pilot. High-school learners would need guardian consent and are better left for a later round. |
| Payment | Optional. If you pay, pay the same for finishing the tests regardless of how much anyone reads, so the reading itself stays voluntary. |

If you run this inside a university or company, ask whether it needs ethics or research approval before you recruit. This plan isn't legal or ethics advice.

## Prerequisite: a link participants can open

Right now the reader only runs locally (`npm run serve`), which participants can't use. Before the pilot, one of these is needed:

- **GitHub Pages.** This needs the repo to be public (Pages on a private repo needs a paid plan). Making it public needs a full-history secret scan first. It's the simplest option for participants.
- **Another static host** pointing at the same files. Note that participants' progress lives in *that* host's browser storage.

Whatever the choice, **use one URL for the whole pilot.** Progress is stored per website address, so changing the link mid-pilot makes everyone's progress look empty.

## Timeline

Times are relative to each participant's first session (Day 0).

| When | What | Length |
|---|---|---|
| Day −1 | Send the participant guide (`docs/pilot/participant-guide.md`) and the consent text. Get their consent in writing (a chat message is fine). | 5 min |
| Day 0 | **Pre-test** (all 43 items, Part A only; see below). Then open cliffword and read chapter 1 in any mode they like. For 3–4 participants, do this as a think-aloud session on a call: watch, don't help, note where they get stuck. | 30–40 min |
| Days 0–6 | Free use. They read chapters 2–3 if and when they want. No reminders about reading. One neutral reminder about the test dates is fine. | — |
| Day 1 (20–28 h after Day 0) | **Next-day test**, Parts A–C. Ask them *not* to open cliffword in the 2 hours before. | 15 min |
| Day 7 (6–8 days after Day 0) | **One-week test**, Parts A–C, with different sentences from Day 1. Then the exit survey, then **export and send the backup file**. | 25 min |

Don't open the 今日复习 queue for them or explain how it works beyond the guide. Whether they use it on their own is part of the engagement data.

## The delayed recall test

The test items are in [`docs/pilot/recall-items.json`](pilot/recall-items.json), and `npm run pilot:forms` prints them as forms (see [`docs/pilot/README.md`](pilot/README.md)). The test covers 43 words:

- **33 target words**, every target word in 《画皮》.
- **10 control words** at a similar IELTS level that appear **nowhere** in cliffword. Gains on these show how much people learn just from taking the test, or from outside study. The story's effect is roughly the target gain *minus* the control gain.

Each test has three parts, always in this order and with no going back, because each part reveals more than the one before:

| Part | Task | What it measures |
|---|---|---|
| **A. Form recall (ZH→EN)** | A Chinese meaning plus the first letter, e.g. `书生 (s______)`; they type the English word. | Can they produce the word? This is the hardest part. |
| **B. Transfer** | A **new** English sentence with a blank and the first letter. The sentence comes from neither the story nor the app's 迁移 examples. | Does the word work outside the story? |
| **C. Meaning recall (EN→ZH)** | The English word; they write its meaning in Chinese. | Do they recognize it? This is the easiest part. |

Day 1 and Day 7 use **different** Part B sentences, so a week-one score can't come from remembering a Day 1 sentence.

The test itself is practice, and that can't be avoided. Taking it on Day 1 helps on Day 7. The control words take some of this into account, but not all of it, so say so when reporting.

### How to run it

- Use any form tool that lets you prevent going back to earlier parts, or a paper sheet handed over one part at a time. Put Parts A, B and C on separate pages, and mix up the word order inside each part.
- The participant types or writes their answers; no multiple choice. They put their **participant code** (P01, P02…) on the form, not their name.
- cliffword must be closed during the test.

### Scoring

Score each answer twice: once **strict** and once **lenient**. Decide the rules before anyone takes the test.

- **Part A and Part B (English):**
  - **Strict:** exact spelling, any case.
  - **Lenient:** also accept one wrong, missing or extra letter, or the right word in the wrong form (`flee` for `fled`).
- **Part C (Chinese meaning):** the answer key lists the accepted meanings.
  - **Strict:** only what the answer key lists.
  - **Lenient:** also accept any answer two scorers agree means the same in this context. Mark disagreements and have the second scorer decide.
- Have a second person score a random third of the forms, and report how often the two agree.

## Engagement data (from the export file)

Exports are summarized by `npm run pilot:summary -- <folder>`, which produces one CSV row per participant:

- **days:** how many different calendar days they opened cliffword;
- **chapters:** chapters finished, out of 3;
- **nextChapter:** times they pressed "下一章", each one a voluntary decision to keep reading;
- **answered / correct:** answers given in the app, in any mode, including review;
- **reviews:** reviews done from the 今日复习 queue;
- **saved:** words saved to 生词本;
- **firstDay / lastDay:** the first and last day they used it.

Also note **how far each person read**. A word they never reached can't be compared with one they read. Report scores by chapter reached: chapter 1 introduces 16 words, chapter 2 introduces 11, and chapter 3 introduces 6.

### Exit survey (Day 7, 5 minutes)

1. 你读完第 3 章了吗？如果没有，是在哪里停下的，为什么？
2. 读故事的时候，你会跳过英文单词只看情节吗？（从不 / 有时 / 经常）
3. 最有用的功能是哪个？最烦人的是哪个？
4. 有没有哪个中文释义你觉得不对或不自然？
5. 如果有更多故事，你会继续用吗？（会 / 也许 / 不会）为什么？

Question 2 checks the risk the report raised: readers skipping the English to follow the plot.

## Sending the export file

Participants follow the steps in the participant guide. In short:

1. Open cliffword with the **same browser and link** they used all week.
2. Go to the library page → **备份** → **导出进度**. A file named `cliffword-progress-YYYY-MM-DD.json` downloads.
3. Rename it to their participant code, e.g. `P03.json`.
4. Send it to the researcher the same way they sent consent, e.g. as an email attachment or a WeChat file. They shouldn't post it in a group chat.

**What the file contains:** the words they saved, the answers they typed in the app, the review schedule, reading position, chapters finished, next-chapter clicks and the dates they visited. **It contains no name, no device information and no story text.** Tell participants this before they agree to join.

**What the researcher does with it:**
- Keep exports in a folder **outside** the repo, or in `pilot-data/`, which git ignores. **Never commit them.**
- Delete the files and the CSV when the analysis is written up, or 3 months after the pilot ends, whichever comes first. Tell participants this date.
- If someone sends the wrong file or forgets, they can export again later. Nothing is lost until they clear their browser data.

## Go / no-go after the pilot

**These thresholds are proposals. Confirm or change them before recruiting**, so the result can't move the bar after the fact.

| Area | Proposed "go" bar |
|---|---|
| Usability | At least 80% finish chapter 1 and answer in both directions without help. No problem that stops more than one person. |
| Persistence | Every export opens with `npm run pilot:summary` and shows the use the participant reports. |
| Content accuracy | Fewer than 3 glosses flagged as wrong across all surveys, and each flag is checked and fixed. |
| Engagement | At least half read chapter 3 **and** used cliffword on at least 3 different days. |
| Learning signal | Next-day Part A gain on target words is clearly larger than on control words (for example 25+ points vs under 10). One-week Part A keeps at least half the next-day gain. Part B is above zero for most people. |

"Clearly larger" with about 10 people means a gap you'd still see if one or two participants were removed, not a statistical test.

**If the learning bar is missed but engagement is high,** the story hooks people but the words don't stick. Try fewer words per chapter, or quick recall prompts inside the reader, before writing more stories. **If engagement is low,** look at where people stopped and at their survey answers before changing anything else.

## After the pilot

- Write up the results in `docs/pilot/RESULTS.md` with only aggregate numbers, and no participant codes linked to quotes.
- Fix the usability problems found.
- Decide whether to run a larger comparison against flashcards. If so, follow the report's advice: match word difficulty and study time, and randomly assign which words are studied which way.
