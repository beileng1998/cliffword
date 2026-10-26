import { test, expect } from '@playwright/test';

const wordCard = (page) => page.locator('#word-card');
const answer = (page) => page.locator('#answer');

async function submitAnswer(page, text) {
  await answer(page).getByLabel(/中文意思|英文/).fill(text);
  await answer(page).getByRole('button', { name: '提交' }).click();
}

test('the library lists the built-in story', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/cliffword/);
  await expect(page.getByRole('link', { name: /画皮/ })).toBeVisible();
});

// v0.1 acceptance flow, steps 1–5 (docs/SCOPE.md).
test('read, save, recall in both directions, and keep it all after reload', async ({ page }) => {
  // 1. Library → chapter 1.
  await page.goto('/');
  await page.getByRole('link', { name: /画皮/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('第1章 包袱');

  // 2. Word card, then save.
  await page.getByRole('button', { name: /^scholar，书生/ }).first().click();
  await expect(wordCard(page).getByRole('heading', { name: 'scholar' })).toBeVisible();
  await expect(wordCard(page).getByText('/ˈskɒlə/')).toBeVisible();
  await wordCard(page).getByRole('button', { name: /收藏/ }).click();
  await expect(wordCard(page).getByRole('button', { name: /已收藏/ })).toHaveAttribute('aria-pressed', 'true');
  await wordCard(page).getByRole('button', { name: '关闭' }).click();
  await expect(wordCard(page)).toBeHidden();

  // 3. EN→ZH: one wrong, one right.
  await page.getByRole('link', { name: '英→中' }).click();
  await page.getByRole('button', { name: '写出 scholar 在这句里的意思' }).first().click();
  await submitAnswer(page, '学者');
  await expect(answer(page).getByText('参考答案')).toBeVisible();
  await answer(page).getByRole('button', { name: '知道了' }).click();
  await expect(page.getByRole('button', { name: /^scholar，书生/ }).first()).toHaveClass(/bad/);

  await page.getByRole('button', { name: '写出 dawn 在这句里的意思' }).first().click();
  await submitAnswer(page, '天刚亮');
  await expect(answer(page).getByText('✓ 正确')).toBeVisible();
  await answer(page).getByRole('button', { name: '继续' }).click();
  await expect(page.getByRole('button', { name: /^dawn，天刚亮/ }).first()).toHaveClass(/ok/);

  // 4. ZH→EN: one wrong.
  await page.getByRole('link', { name: '中→英' }).click();
  await page.getByRole('button', { name: /写出“包袱”的英文/ }).first().click();
  await submitAnswer(page, 'bundel');
  await expect(answer(page).getByText('参考答案')).toBeVisible();
  await answer(page).getByRole('button', { name: '知道了' }).click();

  // Move on to chapter 2 so the saved position is not the default.
  await page.getByRole('link', { name: /下一章/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('第2章 拂尘');

  // 5. Reload from the library: position, saved word and errors are restored.
  await page.goto('/');
  await page.reload();
  await expect(page.getByRole('link', { name: /画皮/ })).toContainText('继续阅读 · 第2章');
  await page.getByRole('link', { name: /已收藏 1 个单词/ }).click();
  await expect(page.getByText('scholar', { exact: true })).toBeVisible();

  await page.goto('/#/read/builtin/huapi/01');
  await page.getByRole('button', { name: /^scholar，书生/ }).first().click();
  await expect(wordCard(page).getByText('答错 1 次')).toBeVisible();
  await expect(wordCard(page).getByRole('button', { name: /已收藏/ })).toBeVisible();
});

test('a new English sentence in transfer mode', async ({ page }) => {
  await page.goto('/#/read/builtin/huapi/01?mode=transfer');
  const first = page.locator('.transfer-item').first();
  await expect(first).toContainText('She is a respected');
  await first.getByRole('textbox').fill('scholar');
  await first.getByRole('button', { name: '检查' }).click();
  await expect(first.getByText('✓ 正确')).toBeVisible();
});

test('我的书库 shows an imported book with its own annotations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /演示书/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('第一章 雨夜');
  const chips = page.getByRole('button', { name: /^letter，信/ });
  await expect(chips).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^trust，相信/ })).toHaveCount(2);
  // Untagged text is shown exactly as in the source file.
  await expect(page.locator('.para').nth(1)).toContainText('上没有名字，只有一行字：别');
});

// Steps 6–7 come with review and backup.
test.fixme('errors are due for review the next day, and export/import restores state', async () => {
  // 6. Advance the clock one day: errors are due in review.
  // 7. Export, clear storage, import: the state matches.
});
