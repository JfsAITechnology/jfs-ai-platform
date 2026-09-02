const { chromium } = require('playwright');

const required = [
  'E2E_BASE_URL', 'E2E_SUPABASE_URL', 'E2E_SUPABASE_ANON_KEY',
  'E2E_USER_A_EMAIL', 'E2E_USER_A_PASSWORD', 'E2E_USER_B_EMAIL', 'E2E_USER_B_PASSWORD',
  'E2E_TENANT_A_ID', 'E2E_PRODUCT_A_ID', 'E2E_TENANT_B_ID', 'E2E_PRODUCT_B_ID',
];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required GitHub Actions secret/env: ${name}`);

const BASE_URL = process.env.E2E_BASE_URL.replace(/\/$/, '');
const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;
const TENANT_A = process.env.E2E_TENANT_A_ID;
const PRODUCT_A = process.env.E2E_PRODUCT_A_ID;
const TENANT_B = process.env.E2E_TENANT_B_ID;
const PRODUCT_B = process.env.E2E_PRODUCT_B_ID;

async function signIn(page, email, password) {
  await page.goto(`${BASE_URL}/inventory.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.supabase !== 'undefined');
  const userId = await page.evaluate(async ({ url, key, email, password }) => {
    const client = window.supabase.createClient(url, key);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Supabase login failed: ${error.message}`);
    return data.user.id;
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, email, password });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tenant');
  await page.waitForFunction(() => !document.querySelector('#tenant option')?.textContent?.includes('Memuat tenant'));
  return userId;
}

async function dbQuery(page, table, select, tenantId, filters = {}) {
  return page.evaluate(async ({ url, key, table, select, tenantId, filters }) => {
    const client = window.supabase.createClient(url, key);
    let q = client.from(table).select(select).eq('tenant_id', tenantId);
    for (const [column, value] of Object.entries(filters)) q = q.eq(column, value);
    const { data, error } = await q;
    if (error) throw new Error(`${table} query failed: ${error.message}`);
    return data || [];
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, table, select, tenantId, filters });
}

async function expectDeniedOrEmpty(page, tenantId) {
  return page.evaluate(async ({ url, key, tenantId }) => {
    const client = window.supabase.createClient(url, key);
    const result = await client.from('inventory').select('id,tenant_id').eq('tenant_id', tenantId);
    if (result.error) return { allowed: false, rows: [] };
    return { allowed: true, rows: result.data || [] };
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, tenantId });
}

async function expectRpcDenied(page, tenantId, productId) {
  return page.evaluate(async ({ url, key, tenantId, productId }) => {
    const client = window.supabase.createClient(url, key);
    const { data, error } = await client.rpc('jfs_adjust_inventory', {
      p_tenant_id: tenantId, p_product_id: productId, p_movement_type: 'stock_in',
      p_quantity: 1, p_note: 'E2E unauthorized mutation must fail', p_reference: 'E2E-SECURITY',
    });
    return { data, error: error ? error.message : null };
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, tenantId, productId });
}

async function changeStock(page, type, productId, note) {
  const button = type === 'stock_in' ? 'button.primary' : 'button.danger';
  await page.locator(button).filter({ hasText: type === 'stock_in' ? 'Stok Masuk' : 'Stok Keluar' }).first().click();
  await page.locator('#modalbg.show').waitFor();
  await page.locator('#product').selectOption(productId);
  await page.locator('#amount').fill('1');
  await page.locator('#note').fill(note);
  await page.locator('#saveBtn').click();
  await page.locator('#modalbg.show').waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signIn(pageA, process.env.E2E_USER_A_EMAIL, process.env.E2E_USER_A_PASSWORD);

    await pageA.locator('#tenant').selectOption(TENANT_A);
    await pageA.waitForTimeout(400);
    if (await pageA.locator('#tenant').inputValue() !== TENANT_A) throw new Error('Tenant A selection failed');
    await pageA.waitForFunction((productId) => Array.from(document.querySelectorAll('#rows button')).some(b => b.getAttribute('onclick')?.includes(productId)), PRODUCT_A);
    if (await pageA.locator('#rows tr').count() === 0) throw new Error('Tenant A has no inventory rows');

    const before = await dbQuery(pageA, 'inventory', 'id,product_id,quantity', TENANT_A, { product_id: PRODUCT_A });
    if (before.length !== 1) throw new Error(`Expected exactly one Tenant A inventory fixture row, found ${before.length}`);
    const initialQty = Number(before[0].quantity);

    const inNote = `E2E-STOCK-IN-${Date.now()}`;
    await changeStock(pageA, 'stock_in', PRODUCT_A, inNote);
    const afterIn = await dbQuery(pageA, 'inventory', 'id,product_id,quantity', TENANT_A, { product_id: PRODUCT_A });
    if (Number(afterIn[0].quantity) !== initialQty + 1) throw new Error(`Stock-in failed: expected ${initialQty + 1}, got ${afterIn[0].quantity}`);
    if (!(await pageA.locator('#history').innerText()).includes(inNote)) throw new Error('Stock-in history is not visible in UI');

    const outNote = `E2E-STOCK-OUT-${Date.now()}`;
    await changeStock(pageA, 'stock_out', PRODUCT_A, outNote);
    const afterOut = await dbQuery(pageA, 'inventory', 'id,product_id,quantity', TENANT_A, { product_id: PRODUCT_A });
    if (Number(afterOut[0].quantity) !== initialQty) throw new Error(`Stock-out failed: expected ${initialQty}, got ${afterOut[0].quantity}`);
    const historyTextA = await pageA.locator('#history').innerText();
    if (!historyTextA.includes(inNote) || !historyTextA.includes(outNote)) throw new Error('Stock movement history is incomplete in UI');

    const readB = await expectDeniedOrEmpty(pageA, TENANT_B);
    if (readB.allowed && readB.rows.length > 0) throw new Error('SECURITY FAILURE: Tenant A can read Tenant B inventory');
    const mutateB = await expectRpcDenied(pageA, TENANT_B, PRODUCT_B);
    if (!mutateB.error) throw new Error('SECURITY FAILURE: Tenant A was able to mutate Tenant B inventory');
    await contextA.close();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signIn(pageB, process.env.E2E_USER_B_EMAIL, process.env.E2E_USER_B_PASSWORD);
    await pageB.locator('#tenant').selectOption(TENANT_B);
    await pageB.waitForTimeout(400);
    if (await pageB.locator('#tenant').inputValue() !== TENANT_B) throw new Error('Tenant B selection failed');
    await pageB.waitForFunction((productId) => Array.from(document.querySelectorAll('#rows button')).some(b => b.getAttribute('onclick')?.includes(productId)), PRODUCT_B);
    const bRows = await dbQuery(pageB, 'inventory', 'id,product_id,quantity', TENANT_B, { product_id: PRODUCT_B });
    if (bRows.length !== 1) throw new Error(`Expected exactly one Tenant B inventory fixture row, found ${bRows.length}`);

    console.log('E2E PASS: login → tenant selection → inventory → stock in → stock out → history → Tenant A/B isolation');
    await contextB.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
