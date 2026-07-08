#!/usr/bin/env node
/**
 * Chụp screenshot UI cho Sales Deck (dữ liệu demo Novixa).
 * Yêu cầu: API + Admin + Customer + Staff dev đang chạy.
 *
 *   npm install && npm run capture
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'assets', 'screenshots');

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://127.0.0.1:5173';
const CUSTOMER_URL = process.env.CUSTOMER_URL ?? 'http://127.0.0.1:5174';
const STAFF_URL = process.env.STAFF_URL ?? 'http://127.0.0.1:5175';
const TENANT = process.env.TENANT_CODE ?? 'DEMO_PHARMACY';
const USER = process.env.ADMIN_USER ?? 'admin';
const PASS = process.env.ADMIN_PASS ?? 'Admin@123';

/** @type {{ id: string; slide: number; label: string; url: string; app: 'admin'|'customer'|'staff'; waitMs?: number; prep?: 'dashboard'|'products'|'pos'|'stock'|'none' }[]} */
const SHOTS = [
  { id: '01-dashboard', slide: 8, label: 'Dashboard tong quan', url: '/', app: 'admin', prep: 'dashboard', waitMs: 3500 },
  { id: '02-catalog-products', slide: 10, label: 'Danh muc san pham', url: '/catalog/products', app: 'admin', prep: 'products', waitMs: 2500 },
  { id: '03-procurement-grn', slide: 11, label: 'Nhap kho GRN', url: '/procurement/goods-receipts', app: 'admin', waitMs: 2000 },
  { id: '04-inventory-stock', slide: 12, label: 'Ton kho theo lo', url: '/inventory/stock', app: 'admin', prep: 'stock', waitMs: 2500 },
  { id: '05-sales-pos', slide: 13, label: 'POS quay ban', url: '/sales/pos', app: 'admin', prep: 'pos', waitMs: 3000 },
  { id: '06-customer-crm', slide: 15, label: 'CRM khach hang', url: '/customer/list', app: 'admin', waitMs: 2000 },
  { id: '07-o2o-drafts', slide: 17, label: 'Don app khach O2O', url: '/sales/customer-drafts', app: 'admin', waitMs: 2000 },
  { id: '08-reports-home', slide: 18, label: 'Bao cao Wave 1', url: '/reports', app: 'admin', waitMs: 2000 },
  { id: '09-customer-app-home', slide: 16, label: 'App khach - Trang chu', url: '/', app: 'customer', waitMs: 2500 },
  { id: '10-staff-pos', slide: 14, label: 'Staff POS mobile', url: '/pos', app: 'staff', waitMs: 2500 },
];

async function hideNoise(page) {
  await page
    .addStyleTag({
      content: `
        .api-health-banner { display: none !important; }
        .ant-message { display: none !important; }
      `,
    })
    .catch(() => {});
}

async function waitReady(page) {
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function loginAdmin(page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  const demoBtn = page.getByRole('button', { name: /DEMO_PHARMACY/i });
  if (await demoBtn.isVisible().catch(() => false)) {
    await demoBtn.click();
  } else {
    await page.getByLabel(/Mã nhà thuốc|Tenant/i).fill(TENANT);
    await page.getByLabel(/Tên đăng nhập|Username/i).fill(USER);
    await page.locator('input[name="password"]').fill(PASS);
  }
  await page.getByRole('button', { name: /Đăng nhập|Sign in|Login/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 });
  await waitReady(page);
}

async function loginCustomer(page) {
  await page.goto(`${CUSTOMER_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  const inputs = page.locator('input');
  const count = await inputs.count();
  if (count >= 2) {
    await inputs.nth(0).fill(TENANT);
    await inputs.nth(1).fill('0909123456');
  }
  const sendBtn = page.getByRole('button', { name: /otp|gửi|send|đăng nhập/i }).first();
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click();
    await page.waitForTimeout(2000);
    const otpInputs = page.locator('input[type="text"], input[inputmode="numeric"]');
    for (let i = 0; i < Math.min(await otpInputs.count(), 6); i++) {
      await otpInputs.nth(i).fill('0');
    }
    await page.getByRole('button', { name: /xác nhận|confirm|đăng nhập|login|tiếp tục/i }).click().catch(() => {});
    await page.waitForTimeout(2500);
  }
}

async function loginStaff(page) {
  await page.goto(`${STAFF_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.getByLabel(/Mã nhà thuốc/i).fill(TENANT);
  await page.getByLabel(/Tên đăng nhập/i).fill(USER);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 });
  await waitReady(page);
}

async function prepPage(page, prep) {
  if (prep === 'dashboard') {
    const reload = page.getByRole('button', { name: /Tải lại/i });
    if (await reload.isVisible().catch(() => false)) {
      await reload.click();
      await waitReady(page);
      await page.waitForTimeout(2500);
    }
  }
  if (prep === 'products') {
    await waitReady(page);
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  if (prep === 'stock') {
    await waitReady(page);
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 15000 }).catch(() => {});
  }
  if (prep === 'pos') {
    await waitReady(page);
    const search = page.locator('input[placeholder*="barcode"], input[placeholder*="Barcode"], input[placeholder*="tìm"], input[placeholder*="Tìm"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('8934567890012');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      const addBtn = page.getByRole('button', { name: /Thêm|Add|\+/i }).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
    }
  }
}

async function capture(page, baseUrl, shot) {
  const url = `${baseUrl}${shot.url}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await hideNoise(page);
  if (shot.prep) await prepPage(page, shot.prep);
  await page.waitForTimeout(shot.waitMs ?? 1500);
  await waitReady(page);
  const out = path.join(OUT_DIR, `${shot.id}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  OK ${shot.id} -> ${out}`);
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'vi-VN',
  });
  const page = await context.newPage();
  const manifest = [];

  console.log('Login admin...');
  await loginAdmin(page);

  for (const shot of SHOTS.filter((s) => s.app === 'admin')) {
    try {
      const file = await capture(page, ADMIN_URL, shot);
      manifest.push({ ...shot, file: path.relative(__dirname, file).replace(/\\/g, '/') });
    } catch (e) {
      console.warn(`  SKIP ${shot.id}: ${e.message}`);
      manifest.push({ ...shot, error: e.message });
    }
  }

  const customerPage = await context.newPage();
  await customerPage.setViewportSize({ width: 390, height: 844 });
  customerPage.context().setDefaultTimeout(90000);
  console.log('Customer app...');
  try {
    await loginCustomer(customerPage);
    await hideNoise(customerPage);
    for (const shot of SHOTS.filter((s) => s.app === 'customer')) {
      const file = await capture(customerPage, CUSTOMER_URL, shot);
      manifest.push({ ...shot, file: path.relative(__dirname, file).replace(/\\/g, '/') });
    }
  } catch (e) {
    console.warn(`  Customer app skip: ${e.message}`);
  }

  const staffPage = await context.newPage();
  await staffPage.setViewportSize({ width: 390, height: 844 });
  console.log('Staff app...');
  try {
    await loginStaff(staffPage);
    for (const shot of SHOTS.filter((s) => s.app === 'staff')) {
      const file = await capture(staffPage, STAFF_URL, shot);
      manifest.push({ ...shot, file: path.relative(__dirname, file).replace(/\\/g, '/') });
    }
  } catch (e) {
    console.warn(`  Staff app skip: ${e.message}`);
  }

  await browser.close();
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ capturedAt: new Date().toISOString(), shots: manifest }, null, 2));
  console.log(`\nManifest: ${manifestPath}`);
  console.log(`Captured ${manifest.filter((m) => !m.error).length}/${SHOTS.length} screenshots`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
