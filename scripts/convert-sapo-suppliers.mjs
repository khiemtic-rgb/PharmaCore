/**
 * Chuyển export Sapo (danh sách NCC) → CSV import Novixa.
 *
 * Usage:
 *   node scripts/convert-sapo-suppliers.mjs "C:\path\to\sapo-ncc.xlsx" import/xuan-hoa
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('client/admin/package.json'));
const XLSX = require('xlsx');

const inputPath = process.argv[2];
const outDir = process.argv[3] || 'import/xuan-hoa';

if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('Usage: node scripts/convert-sapo-suppliers.mjs <sapo-ncc.xlsx> [outDir]');
  process.exit(1);
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

function joinAddress(...parts) {
  return parts.map((p) => String(p ?? '').trim()).filter(Boolean).join(', ');
}

const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

const outRows = [];
const warnings = [];

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const rowNum = i + 2;
  const code = String(r['Mã nhà cung cấp'] ?? r['Ma nha cung cap'] ?? '').trim();
  const name = String(r['Tên nhà cung cấp *'] ?? r['Ten nha cung cap'] ?? '').trim();
  const phone = String(r['Điện thoại'] ?? r['Dien thoai'] ?? '').trim();
  const email = String(r.Email ?? r['Người liên hệ - Email'] ?? '').trim();
  const contact = String(r['Người liên hệ'] ?? '').trim();
  const contactPhone = String(r['Người liên hệ - Số điện thoại'] ?? '').trim();
  const address = joinAddress(
    r['Địa chỉ 1 *'],
    r['Phường xã'],
    r['Quận huyện'],
    r['Tỉnh/ Thành phố'],
  );

  if (!code) {
    warnings.push(`Dòng ${rowNum}: thiếu mã NCC — bỏ qua`);
    continue;
  }
  if (name.length < 2) {
    warnings.push(`Dòng ${rowNum} (${code}): thiếu tên — bỏ qua`);
    continue;
  }

  outRows.push({
    supplier_code: code,
    supplier_name: name,
    tax_code: '',
    contact_name: contact || undefined,
    phone: phone || contactPhone || '',
    email,
    address,
    payment_terms: 30,
  });
}

const headers = [
  'supplier_code',
  'supplier_name',
  'tax_code',
  'contact_name',
  'phone',
  'email',
  'address',
  'payment_terms',
];

const base = path.resolve(outDir);
const outFile = path.join(base, 'nha-cung-cap-novixa.csv');
writeCsv(outFile, headers, outRows);

const report = [
  '# Chuyển NCC Sapo → Novixa',
  '',
  `Nguồn: ${inputPath}`,
  `Dòng Sapo: ${rows.length}`,
  `NCC export: ${outRows.length}`,
  '',
  `Cảnh báo (${warnings.length}):`,
  ...warnings.map((w) => `- ${w}`),
  '',
  `File: ${outFile}`,
].join('\n');

fs.writeFileSync(path.join(base, 'ncc-conversion-report.md'), report, 'utf8');
console.log(report);
