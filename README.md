# cliffword

**读一个停不下来的中文故事，顺手记住里面的英文单词。**
Serialized Chinese stories with English target words woven in, plus recall exercises and next-day review. A static web app: no accounts, no backend, no AI at runtime.

> **Status: pre-alpha.** The reader works: library (built-in stories and 我的书库), chapter reader, word cards with browser pronunciation, four modes (阅读, 英→中, 中→英, 迁移), next-day review, progress backup, and a local reading summary. All seven v0.1 acceptance steps pass. The first story is 《画皮》, a retelling of the 聊斋志异 tale. See [docs/SCOPE.md](docs/SCOPE.md) for what v0.1 will do and the check that proves it.

## Why

Word lists are easy to quit. A cliffhanger isn't. cliffword tests whether wanting to read the next chapter can be turned into English vocabulary that you still know the next day, and that works outside the story.

How it differs from similar tools:

- [JiaduReader 夹读](https://github.com/qqw666666qqw/mixreader) runs a dictionary over any Chinese book you upload and swaps in English words. cliffword ships stories written for the purpose and reviewed by a person. Every English word is tagged where it appears, with its meaning *in that sentence*, and then practised in both directions and in new English sentences.
- [Lute](https://github.com/LuteOrg/lute-v3) works the other way round: you read a full English text and look up the words you don't know.

## How content looks

A chapter paragraph is a list of plain Chinese text and tagged words:

```json
{
  "segments": [
    "警察在门把手上找到了新的",
    { "w": "evidence-n", "form": "evidence", "gloss": "证据" },
    "。"
  ]
}
```

The word itself lives once in `vocab.json`, with its pronunciation, part of speech and an English example sentence:

```json
{ "id": "evidence-n", "lemma": "evidence", "ipa": "/ˈevɪdəns/", "pos": "n.",
  "example": "There is no evidence that he was ever there." }
```

The format is documented in [docs/CONTENT.md](docs/CONTENT.md).

## Read your own books

Give your own Codex or Claude Code a book you have as a local `.txt` file, and it does the rest. Open the agent in this repo and say, for example:

> 用 cliffword-annotate 把这本书做成 cliffword：~/books/my-book.txt

Using the `cliffword-annotate` skill, the agent then:
1. imports the file into `library/`;
2. picks 8–15 IELTS words per chapter from the bundled word list;
3. writes small annotation files next to your untouched text;
4. checks every word, form and Chinese meaning against the dictionary until the book passes;
5. tells you to run `npm run serve` and open it under 我的书库.

Your book stays on your machine: `library/` is gitignored, and nothing is downloaded or uploaded. Only import texts you have the right to use.

## Develop

Requires Node 20 or later. To read locally, run `npm run serve` and open http://127.0.0.1:4173.

```bash
npm install
```

```bash
npm test
```

`npm test` runs the content validator's unit tests and checks every story in `content/`.

```bash
npm run test:e2e
```

That runs the browser tests at phone and desktop sizes. Run `npx playwright install chromium` once first.

## License

Code: [MIT](LICENSE). Stories and word data in `content/`: [CC-BY-4.0](LICENSE-CONTENT). `data/ielts.json` is derived from [ECDICT](https://github.com/skywind3000/ECDICT) under the MIT license ([data/ECDICT-LICENSE](data/ECDICT-LICENSE)).

## Support

A hobby project, maintained on a best-effort basis with no SLA.
