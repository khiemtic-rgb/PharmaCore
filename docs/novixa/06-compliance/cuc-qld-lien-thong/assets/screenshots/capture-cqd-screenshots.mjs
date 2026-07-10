#!/usr/bin/env node
/**
 * Chụp 12 screenshot phục vụ hồ sơ liên thông Cục QLD.
 * Yêu cầu: API (5290) + Admin (5173) đang chạy.
 *
 *   npm install && npm run capture
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://127.0.0.1:5173';
const TENANT = process.env.TENANT_CODE ?? 'DEMO_PHARMACY';
const USER = process.env.ADMIN_USER ?? 'admin';
const PASS = process.env.ADMIN_PASS ?? 'Admin@123';

/** @type {{ id: string; label: string; url: string; waitMs?: number; prep?: string; login?: boolean }} */
const SHOTS = [
  { id: '01-login', label: 'Dang nhap', url: '/login', waitMs: 1200, login: false },
  { id: '02-dashboard', label: 'Dashboard', url: '/', prep: 'dashboard', waitMs: 3500 },
  { id: '03-pos', label: 'POS ban hang', url: '/sales/pos', prep: 'pos', waitMs: 3000 },
  { id: '04-drug-master', label: 'Danh muc thuoc', url: '/catalog/products', prep: 'table', waitMs: 2500 },
  { id: '05-inventory', label: 'Kho FEFO', url: '/inventory/stock', prep: 'table', waitMs: 2500 },
  { id: '06-grn', label: 'Nhap thuoc GRN', url: '/procurement/goods-receipts', prep: 'table', waitMs: 2500 },
  { id: '07-sale', label: 'Don ban thuoc', url: '/sales/orders', prep: 'table', waitMs: 2500 },
  { id: '08-report-nxt', label: 'Bao cao N-X-T', url: '/reports/inventory/movement-summary', prep: 'report', waitMs: 4000 },
  { id: '09-report-revenue', label: 'Bao cao doanh thu', url: '/reports/sales/revenue-by-period', prep: 'report', waitMs: 4000 },
  { id: '10-drug-connectivity', label: 'Lien thong QD540', url: '/inventory/qd540-export', prep: 'qd540', waitMs: 3000 },
  { id: '11-api-config', label: 'Cau hinh API / CSDL QG', url: '/catalog/national-drugs', prep: 'national', waitMs: 3000 },
  { id: '12-sync-log', label: 'Nhat ky dong bo', url: '/inventory/qd540-export', prep: 'sync-log', waitMs: 3500 },
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
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'hidden', timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function fillLoginForm(page) {
  const demoBtn = page.getByRole('button', { name: /DEMO_PHARMACY/i });
  if (await demoBtn.isVisible().catch(() => false)) {
    await demoBtn.click();
    return;
  }
  await page.getByLabel(/Mã nhà thuốc|Mã cửa hàng|Tenant/i).fill(TENANT);
  await page.getByLabel(/Tên đăng nhập|Username/i).fill(USER);
  await page.locator('input[name="password"]').fill(PASS);
}

async function loginAdmin(page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  await fillLoginForm(page);
  await page.getByRole('button', { name: /Đăng nhập|Sign in|Login/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 });
  await waitReady(page);
}

async function prepPage(page, prep) {
  if (prep === 'dashboard') {
    const reload = page.getByRole('button', { name: /Tải lại/i });
    if (await reload.isVisible().catch(() => false)) {
      await reload.click();
      await waitReady(page);
      await page.waitForTimeout(2000);
    }
  }
  if (prep === 'table') {
    await waitReady(page);
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 15000 }).catch(() => {});
  }
  if (prep === 'pos') {
    await waitReady(page);
    const search = page
      .locator('input[placeholder*="barcode"], input[placeholder*="Barcode"], input[placeholder*="tìm"], input[placeholder*="Tìm"]')
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('8934567890012');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1200);
    }
  }
  if (prep === 'report') {
    await waitReady(page);
    const runBtn = page.getByRole('button', { name: /Chạy báo cáo|Run report|Tải báo cáo|Xem báo cáo/i }).first();
    if (await runBtn.isVisible().catch(() => false)) {
      await runBtn.click();
      await waitReady(page);
      await page.waitForTimeout(2000);
    }
  }
  if (prep === 'national') {
    await waitReady(page);
    const searchBtn = page.getByRole('button', { name: /Tìm kiếm|Search/i }).first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await page.locator('input[type="search"], input[placeholder*="tìm"], input[placeholder*="Tìm"]').first().fill('Paracetamol');
      await searchBtn.click().catch(async () => {
        await page.keyboard.press('Enter');
      });
      await waitReady(page);
      await page.waitForTimeout(1500);
    }
  }
  if (prep === 'qd540' || prep === 'sync-log') {
    await waitReady(page);
    const previewBtn = page.getByRole('button', { name: /Xem trước|Preview|Tải dữ liệu/i }).first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await waitReady(page);
      await page.waitForTimeout(prep === 'sync-log' ? 2500 : 1500);
    }
  }
}

async function capture(page, shot) {
  const url = `${ADMIN_URL}${shot.url}`;
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

  const manifest = [];

  // 01-login — trang chưa đăng nhập
  const loginPage = await context.newPage();
  await loginPage.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  await fillLoginForm(loginPage);
  await hideNoise(loginPage);
  await loginPage.waitForTimeout(1000);
  const loginOut = path.join(OUT_DIR, '01-login.png');
  await loginPage.screenshot({ path: loginOut, fullPage: false });
  console.log(`  OK 01-login -> ${loginOut}`);
  manifest.push({ id: '01-login', file: '01-login.png' });
  await loginPage.close();

  const page = await context.newPage();
  console.log('Login admin...');
  await loginAdmin(page);

  for (const shot of SHOTS.filter((s) => s.id !== '01-login')) {
    try {
      const file = await capture(page, shot);
      manifest.push({ id: shot.id, label: shot.label, file: path.basename(file) });
    } catch (e) {
      console.warn(`  SKIP ${shot.id}: ${e.message}`);
      manifest.push({ id: shot.id, error: e.message });
    }
  }

  await browser.close();
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify({ capturedAt: new Date().toISOString(), adminUrl: ADMIN_URL, tenant: TENANT, shots: manifest }, null, 2),
  );
  console.log(`\nManifest: ${manifestPath}`);
  console.log(`Captured ${manifest.filter((m) => !m.error).length}/${SHOTS.length} screenshots`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
