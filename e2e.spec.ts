
import { test, expect } from '@playwright/test';

test('take screenshot', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.screenshot({ path: 'first-screen.png' });
});
