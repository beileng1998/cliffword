import { test, expect } from '@playwright/test';

test('the app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/cliffword/);
});

// v0.1 acceptance flow from docs/SCOPE.md. Unmark as the reader gets built.
test.fixme('read, recall, review and back up a chapter', async () => {
  // 1. Open the library and start chapter 1.
  // 2. Open a word card and save the word.
  // 3. EN→ZH mode: answer one wrong, one right.
  // 4. ZH→EN mode: answer one wrong.
  // 5. Reload: reading position, saved word and errors are restored.
  // 6. Advance the clock one day: errors are due in review.
  // 7. Export, clear storage, import: the state matches.
});
