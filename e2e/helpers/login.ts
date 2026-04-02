import { expect, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL || 'demo@pm-ai-tool.local';
const password = process.env.E2E_PASSWORD || 'demo12345';

/** Log in as seeded demo user; ends on dashboard (`/`). */
export async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
