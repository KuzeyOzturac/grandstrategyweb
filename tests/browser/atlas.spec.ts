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

test('zooming in keeps state polygons local to their regions', async ({ page }) => {
  const stateRequest = page.waitForRequest((request) => request.url().includes('/data/states.json'));
  await page.goto('/');
  expect((await stateRequest).url()).toContain('?v=f4c5b9a9');
  await expect(page.getByText('Loading world map…')).toBeHidden();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  for (const label of ['Ontario — Canada', 'Shaviyani Atoll — Maldives']) {
    const shape = page.locator('path.state').filter({ has: page.locator('title', { hasText: label }) });
    await expect(shape).toHaveCount(1);
    const box = await shape.evaluate((element) => {
      const bounds = (element as SVGGraphicsElement).getBBox();
      return { width: bounds.width, height: bounds.height };
    });
    expect(box.width).toBeLessThan(500);
    expect(box.height).toBeLessThan(300);
  }
});
