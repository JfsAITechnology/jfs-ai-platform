import { test, expect } from '@playwright/test';

const BASE='https://jfsaitechnology.github.io/jfs-ai-platform/customer.html';
test('customer landing renders premium hero and new robot', async ({ page }) => {
  await page.goto(BASE, { waitUntil:'networkidle' });
  await expect(page.locator('h1')).toContainText('Bisnis Anda butuh solusi');
  await expect(page.locator('.hero-mascot')).toHaveAttribute('src', /SX8Nffkf/);
  await expect(page.getByRole('button', {name:/Saya Butuh Solusi/})).toBeVisible();
});
test('AI selector recommends each service', async ({ page }) => {
  await page.goto(BASE, { waitUntil:'networkidle' });
  for (const name of ['Keuangan','Laundry','Logistik','Toko']) {
    await page.getByRole('button', {name:new RegExp(name)}).click();
    await expect(page.locator('#recommend')).toHaveClass(/show/);
    await expect(page.locator('#recBtn')).toHaveAttribute('href', /.+/);
  }
});
test('all service CTA destinations are present', async ({ page }) => {
  await page.goto(BASE, { waitUntil:'networkidle' });
  const hrefs=await page.locator('.app .cta a').evaluateAll(as=>as.map(a=>a.href));
  expect(hrefs).toHaveLength(4);
  expect(hrefs.some(x=>x.includes('keuangan-pintar'))).toBeTruthy();
  expect(hrefs.some(x=>x.includes('jfs-laundry-ai'))).toBeTruthy();
  expect(hrefs.some(x=>x.includes('rekap-login.html'))).toBeTruthy();
  expect(hrefs.some(x=>x.includes('ARANE-Elektronik/index.html'))).toBeTruthy();
});

test('JFS AI CS chat is available and founder escalation UI exists', async ({ page }) => {
  await page.goto(BASE, { waitUntil:'networkidle' });
  await expect(page.locator('#chatLaunch')).toBeVisible();
  await page.locator('#chatLaunch').click();
  await expect(page.locator('#chatPanel')).toHaveClass(/open/);
  await expect(page.getByText('CS AI JFS AI')).toBeVisible();
  await expect(page.getByRole('button', {name:'Produk ready'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Cari solusi'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Founder'})).toBeVisible();
  await expect(page.locator('#founderBtn')).toHaveAttribute('href', /wa\.me/);
});
