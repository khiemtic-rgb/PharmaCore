/**
 * Chuyển export Sapo (danh sách khách hàng) → CSV import Novixa.
 *
 * Usage:
 *   node scripts/convert-sapo-customers.mjs "C:\path\to\sapo-kh.xlsx" import/xuan-hoa
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('client/admin/package.json'));
const XLSX = require('xlsx');

const inputPath = process.argv[2];
const outDir = process.argv[3] || 'import/xuan-hoa';

if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('Usage: node scripts/convert-sapo-customers.mjs <sapo-kh.xlsx> [outDir]');
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

function normalizePhone(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/^\+84/, '0');
}

function mapGender(raw) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'nam') return '1';
  if (v === 'nữ' || v === 'nu') return '2';
  return '';
}

function parseDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return '';
  let day = m[1];
  let month = m[2];
  let year = m[3];
  if (year.length === 2) year = `19${year}`;
  if (Number(day) <= 12 && Number(month) > 12) {
    [day, month] = [month, day];
  }
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames.find((n) => /khach/i.test(n)) ?? wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

const outRows = [];
const warnings = [];
const phonesSeen = new Set();
const codesSeen = new Set();

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const rowNum = i + 2;
  const code = String(r['Mã khách hàng'] ?? r['Ma khach hang'] ?? '').trim().toUpperCase();
  const name = String(r['Tên khách hàng *'] ?? r['Ten khach hang'] ?? '').trim();
  let phone = normalizePhone(r['Điện thoại'] ?? r['Dien thoai']);
  const email = String(r.Email ?? '').trim();
  const dateOfBirth = parseDate(r['Ngày sinh'] ?? r['Ngay sinh']);
  const gender = mapGender(r['Giới tính'] ?? r['Gioi tinh']);

  if (!code) {
    warnings.push(`Dòng ${rowNum}: thiếu mã KH — bỏ qua`);
    continue;
  }
  if (codesSeen.has(code)) {
    warnings.push(`Dòng ${rowNum} (${code}): mã trùng trong file — bỏ qua`);
    continue;
  }
  codesSeen.add(code);

  if (name.length < 2) {
    warnings.push(`Dòng ${rowNum} (${code}): thiếu tên — bỏ qua`);
    continue;
  }

  let phoneSynthetic = '0';
  if (!phone) {
    phone = `S-${code}`;
    phoneSynthetic = '1';
    warnings.push(`Dòng ${rowNum} (${code}): không có SĐT — dùng placeholder ${phone}`);
  }

  if (phone.length > 20) {
    warnings.push(`Dòng ${rowNum} (${code}): SĐT quá dài — bỏ qua`);
    continue;
  }

  if (phonesSeen.has(phone)) {
    warnings.push(`Dòng ${rowNum} (${code}): SĐT trùng ${phone} — bỏ qua`);
    continue;
  }
  phonesSeen.add(phone);

  outRows.push({
    customer_code: code,
    full_name: name,
    phone,
    email,
    date_of_birth: dateOfBirth,
    gender,
    phone_synthetic: phoneSynthetic,
  });
}

const headers = [
  'customer_code',
  'full_name',
  'phone',
  'email',
  'date_of_birth',
  'gender',
  'phone_synthetic',
];

const base = path.resolve(outDir);
const outFile = path.join(base, 'khach-hang-novixa.csv');
writeCsv(outFile, headers, outRows);

const syntheticCount = outRows.filter((r) => r.phone_synthetic === '1').length;
const report = [
  '# Chuyển khách hàng Sapo → Novixa',
  '',
  `Nguồn: ${inputPath}`,
  `Sheet: ${sheetName}`,
  `Dòng Sapo: ${rows.length}`,
  `KH export: ${outRows.length}`,
  `SĐT placeholder (S-{mã}): ${syntheticCount}`,
  '',
  'Lưu ý: Điểm tích lũy / hạng thẻ Sapo chưa import — cấu hình loyalty sau nếu cần.',
  '',
  `Cảnh báo (${warnings.length}):`,
  ...warnings.slice(0, 50).map((w) => `- ${w}`),
  warnings.length > 50 ? `- … và ${warnings.length - 50} dòng khác` : '',
  '',
  `File: ${outFile}`,
].join('\n');

fs.writeFileSync(path.join(base, 'kh-conversion-report.md'), report, 'utf8');
console.log(report);
