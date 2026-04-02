import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsDemo } from './helpers/login';

type Violation = {
  id: string;
  impact?: string | null;
  help: string;
  nodes: { html: string }[];
};

function assertNoCriticalOrSerious(violations: Violation[]) {
  const bad = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
}

function axe(page: Page) {
  return new AxeBuilder({ page });
}

test.describe('Accessibility (axe, serious and critical)', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login');
    const { violations } = await axe(page).analyze();
    assertNoCriticalOrSerious(violations);
  });

  test('dashboard', async ({ page }) => {
    await loginAsDemo(page);
    const { violations } = await axe(page).analyze();
    assertNoCriticalOrSerious(violations);
  });

  test('settings', async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    const { violations } = await axe(page).analyze();
    assertNoCriticalOrSerious(violations);
  });

  test('wireframes', async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole('link', { name: 'Wireframes' }).click();
    await expect(page.getByRole('heading', { name: 'Wireframes' })).toBeVisible();
    const { violations } = await axe(page).analyze();
    assertNoCriticalOrSerious(violations);
  });
});
