import { test, expect } from '@playwright/test';

test('searches countries and shows their administrative regions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Explore the world')).toBeVisible();
  await page.getByLabel('Find a place').fill('Canada');
  await page.getByRole('button', { name: 'Canada Country' }).click();
  await expect(page.getByText('SELECTED COUNTRY')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ontario' })).toBeVisible();
  await page.getByRole('button', { name: 'Ontario' }).click();
  await expect(page.getByText('Owned by Canada')).toBeVisible();
});
