# Security policy

## Reporting a vulnerability

Please report security problems **privately** through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**, or go to <https://github.com/milesradford99/cliffword/security/advisories/new>.

Don't open a public issue or pull request for a vulnerability, and don't post details anywhere else until a fix is out.

A useful report says:
- what is affected (a file, a command, or a page in the reader);
- the steps to reproduce it;
- what an attacker could do with it.

## What to expect

cliffword is a hobby project maintained on a best-effort basis, with no SLA. The aim is to acknowledge a report within 7 days and to say then whether it's accepted. Fixes for accepted reports go out as soon as practical, credited to you unless you'd rather stay anonymous.

## Supported versions

There's no release yet. Fixes go to `main`. Once releases exist, only the latest one gets fixes.

## Scope

cliffword is a static web app with no backend, no accounts and no server-side storage. Learning progress stays in the reader's browser. Things worth reporting include:

- **Script injection in the reader.** For example, a crafted imported book, annotation file or backup file that runs code or injects markup. All content is supposed to be shown as text only.
- **Leaks from the local library.** A backup or export that ends up containing text from a book in `library/`, or any network request carrying a reader's data.
- **The dev server** (`scripts/serve.mjs`) serving files outside the repo, `.git` or `node_modules`.
- **Agent instructions** (`AGENTS.md`, `.agents/skills/`) that could make a coding agent fetch, copy or commit text it shouldn't, or run commands it shouldn't.
- **CI and release configuration** that exposes secrets or gives untrusted code write access.

Not security issues; please open a normal issue instead:

- wrong glosses, pronunciations or example sentences;
- pronunciation differences between browsers or devices;
- problems that need someone to already control your computer or browser.
