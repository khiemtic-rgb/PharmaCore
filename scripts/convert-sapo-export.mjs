/**
 * Chuyển export Sapo (danh sách sản phẩm) → CSV import Novixa.
 *
 * Usage:
 *   node scripts/convert-sapo-export.mjs "C:\path\to\sapo.xlsx" import/xuan-hoa
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('client/admin/package.json'));
const XLSX = require('xlsx');

const inputPath = process.argv[2];
const outDir = process.argv[3] || 'import/xuan-hoa';

if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('Usage: node scripts/convert-sapo-export.mjs <sapo.xlsx> [outDir]');
  process.exit(1);
}

const INIT_BATCH = 'TON-DAU-SAPO';
const INIT_EXPIRY = '2030-12-31';

function parseMoney(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '\uFEFF' + lines.join('\n'), 'utf8');
}

const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

const seenBarcodes = new Set();
const catalogRows = [];
const stockCn1 = [];
const stockCn2 = [];
const warnings = [];

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const rowNum = i + 2;
  const code = String(r['Mã SKU*'] ?? '').trim();
  let name = String(r['Tên sản phẩm*'] ?? '').trim();
  if (!name) name = String(r['Tên phiên bản sản phẩm'] ?? '').trim();
  let barcode = String(r.Barcode ?? '').trim();
  const unit = String(r['Đơn vị'] ?? '').trim() || 'Viên';
  let retail = parseMoney(r['PL_Giá bán lẻ']);
  const cost = parseMoney(r['PL_Giá nhập']);
  const min1 = parseMoney(r['LC_CN1_Tồn tối thiểu']);
  const min2 = parseMoney(r['LC_CN2_Tồn tối thiểu']);
  const q1 = parseMoney(r['LC_CN1_Tồn kho ban đầu*']);
  const q2 = parseMoney(r['LC_CN2_Tồn kho ban đầu*']);
  const cost1 = parseMoney(r['LC_CN1_Giá vốn khởi tạo*']) || cost;
  const cost2 = parseMoney(r['LC_CN2_Giá vốn khởi tạo*']) || cost;

  if (!code) {
    warnings.push(`Dòng ${rowNum}: thiếu mã SKU — bỏ qua`);
    continue;
  }
  if (name.length < 2) {
    warnings.push(`Dòng ${rowNum} (${code}): thiếu tên — bỏ qua`);
    continue;
  }

  if (barcode) {
    if (seenBarcodes.has(barcode)) {
      warnings.push(`Dòng ${rowNum} (${code}): barcode trùng ${barcode} — bỏ barcode dòng này`);
      barcode = '';
    } else {
      seenBarcodes.add(barcode);
    }
  }

  if (retail <= 0) {
    if (cost > 0) {
      retail = cost;
      warnings.push(`Dòng ${rowNum} (${code}): không có giá bán — dùng giá vốn ${cost}`);
    } else {
      retail = 0;
    }
  }

  catalogRows.push({
    product_code: code,
    product_name: name,
    generic_name: String(r['Hoạt chất chính *'] ?? '').trim(),
    barcode,
    sale_unit_name: unit,
    retail_price: retail,
    min_stock_qty: Math.max(min1, min2) || '',
    category_code: '',
    brand_code: '',
    drug_type: 1,
  });

  if (q1 > 0) {
    stockCn1.push({
      product_key: code,
      batch_number: INIT_BATCH,
      expiry_date: INIT_EXPIRY,
      quantity: q1,
      unit_cost: cost1,
    });
  }
  if (q2 > 0) {
    stockCn2.push({
      product_key: code,
      batch_number: INIT_BATCH,
      expiry_date: INIT_EXPIRY,
      quantity: q2,
      unit_cost: cost2,
    });
  }
}

const catalogHeaders = [
  'product_code',
  'product_name',
  'generic_name',
  'barcode',
  'sale_unit_name',
  'retail_price',
  'min_stock_qty',
  'category_code',
  'brand_code',
  'drug_type',
];

const stockHeaders = ['product_key', 'batch_number', 'expiry_date', 'quantity', 'unit_cost'];

const base = path.resolve(outDir);
writeCsv(path.join(base, 'danh-muc-novixa.csv'), catalogHeaders, catalogRows);
writeCsv(path.join(base, 'ton-dau-CN1.csv'), stockHeaders, stockCn1);
writeCsv(path.join(base, 'ton-dau-CN2.csv'), stockHeaders, stockCn2);

const report = [
  '# Báo cáo chuyển Sapo → Novixa',
  '',
  `Nguồn: ${inputPath}`,
  `Sheet: ${sheetName}`,
  `Dòng Sapo: ${rows.length}`,
  `Danh mục Novixa: ${catalogRows.length}`,
  `Tồn CN1 (LC_CN1): ${stockCn1.length} dòng`,
  `Tồn CN2 (LC_CN2): ${stockCn2.length} dòng`,
  '',
  'Lô tồn đầu: batch_number = TON-DAU-SAPO, expiry = 2030-12-31 (placeholder — cần cập nhật lô/HSD thật sau kiểm kê).',
  '',
  `Cảnh báo (${warnings.length}):`,
  ...warnings.slice(0, 50).map((w) => `- ${w}`),
  ...(warnings.length > 50 ? [`... và ${warnings.length - 50} cảnh báo khác`] : []),
  '',
  'File output:',
  `- ${path.join(base, 'danh-muc-novixa.csv')}`,
  `- ${path.join(base, 'ton-dau-CN1.csv')}`,
  `- ${path.join(base, 'ton-dau-CN2.csv')}`,
].join('\n');

fs.writeFileSync(path.join(base, 'conversion-report.md'), report, 'utf8');

console.log(report);
