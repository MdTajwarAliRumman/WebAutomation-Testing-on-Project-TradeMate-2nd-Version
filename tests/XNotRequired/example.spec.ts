import { test, expect } from '@playwright/test';
import { getScreenshotName } from '../../src/utils/screenshotHelper';
test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started button ', async ({ page }, testInfo) => {
  await page.goto('https://playwright.dev/');

  // Element Screenshot
  // await page.locator("//a[normalize-space()='Get started']").screenshot({ path: './screenshots/ss3dif1.png' })

  // // Bugged Page Screenshot
  // await page.screenshot({ path: './screenshots/pageSs.png' })


  // Element Screenshot
  await page.locator("//a[normalize-space()='Get started']")
    .screenshot({ path: getScreenshotName(testInfo.title) });

  // Full Page Screenshot
  await page.screenshot({
    path: getScreenshotName(testInfo.title)
  });

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();


  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
