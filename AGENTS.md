# AGENTS.md

## Commands

- `npm test`: validator unit tests plus validation of all stories in `content/`. It is expected to fail while `content/` is empty.
- `npm run validate`: validate the stories only, printing every error.
- `npm run test:e2e`: Playwright tests at 390×844 and 1280×800. It serves the repo root with `scripts/serve.mjs` on port 4173.

## Gotchas

- No build step and no runtime dependencies. The app is plain HTML, CSS and ES modules served as static files. Don't add a bundler or framework without asking.
- Content is tagged per occurrence (`{ "w": vocabId, "form", "gloss" }`). Never generate it by global find-and-replace.
- `gloss` is the meaning *in that sentence*, not the dictionary headword meaning.
- Each vocab ID is one sense (`evidence-n`, not `evidence`).
- Stories must be original. Don't reproduce or paraphrase commercial stories, names or branding.
- Any AI-drafted story text or gloss needs human review before merge. Say so in the PR.
- Learning state stays in the browser (localStorage). Nothing is sent over the network.
