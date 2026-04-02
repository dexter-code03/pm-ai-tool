import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers/login';

test.describe('Smoke: auth and core navigation', () => {
  test('login, dashboard, settings, wireframes, create PRD, deep link to wireframes', async ({ page }) => {
    await loginAsDemo(page);

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'PRD documents' })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).waitFor({ state: 'visible' });

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByRole('link', { name: 'Wireframes' }).click();
    await expect(page.getByRole('heading', { name: 'Wireframes' })).toBeVisible();

    await page.getByRole('link', { name: 'PRD Documents' }).click();
    await expect(page.getByRole('heading', { name: 'PRD documents' })).toBeVisible();

    await page.getByRole('button', { name: 'New PRD' }).click();
    await expect(page).toHaveURL(/\/prd\/[0-9a-f-]+$/i);

    const prdId = page.url().match(/\/prd\/([^/]+)/)?.[1];
    expect(prdId).toBeTruthy();

    await page.locator('main').getByRole('link', { name: 'Wireframes' }).click();
    await expect(page).toHaveURL(/\/wireframes/);
    const wfUrl = new URL(page.url());
    expect(wfUrl.pathname).toBe('/wireframes');
    expect(wfUrl.searchParams.get('prdId')).toBe(prdId);
    await expect(page.getByRole('heading', { name: 'Wireframes' })).toBeVisible();
  });
});
