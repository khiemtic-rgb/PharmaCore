/**
 * Tạo ảnh OG 1200×630 cho bài tin — chủ đề theo title, tagline Novixa cố định.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..');
export const OUT_DIR = path.join(ROOT, 'public/images/tin-tuc');
export const LOGO_PATH = path.join(ROOT, 'public/images/logo.png');

export const BRAND_TAGLINE = 'Novixa — Nền tảng quản trị nhà thuốc thế hệ mới';
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const THEMES = [
  {
    match: /fefo|hết hạn|cận date|lô|tồn kho|kiểm kê|thất thoát/i,
    label: 'Tồn kho & FEFO',
    accent: '#1fa85c',
    bg: ['#0b4d8c', '#0d5a9e'],
  },
  {
    match: /pos|bán hàng|quầy|quét mã|hóa đơn|ca bán/i,
    label: 'POS nhà thuốc',
    accent: '#38bdf8',
    bg: ['#0b4d8c', '#1e40af'],
  },
  {
    match: /kpi|doanh thu|báo cáo|real-time|lợi nhuận/i,
    label: 'Báo cáo & KPI',
    accent: '#fbbf24',
    bg: ['#0b4d8c', '#334155'],
  },
  {
    match: /gpp|tuân thủ|quy định/i,
    label: 'Tuân thủ GPP',
    accent: '#34d399',
    bg: ['#065f46', '#0b4d8c'],
  },
  {
    match: /crm|khách hàng|chăm sóc/i,
    label: 'CRM khách hàng',
    accent: '#a78bfa',
    bg: ['#4c1d95', '#0b4d8c'],
  },
  {
    match: /ai|thông minh|phân tích/i,
    label: 'Giải pháp thông minh',
    accent: '#22d3ee',
    bg: ['#0e7490', '#0b4d8c'],
  },
  {
    match: /chuỗi|chi nhánh|multi|đa/i,
    label: 'Quản lý chuỗi',
    accent: '#fb923c',
    bg: ['#9a3412', '#0b4d8c'],
  },
  {
    match: /excel|chuyển đổi số|phần mềm|erp/i,
    label: 'Chuyển đổi số',
    accent: '#4ade80',
    bg: ['#14532d', '#0b4d8c'],
  },
];

const DEFAULT_THEME = {
  label: 'Quản lý nhà thuốc',
  accent: '#1fa85c',
  bg: ['#0b4d8c', '#1a6bb5'],
};

export function pickTheme(title, description = '') {
  const text = `${title} ${description}`;
  return THEMES.find((t) => t.match.test(text)) ?? DEFAULT_THEME;
}

export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapLines(text, maxChars = 28, maxLines = 4) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.join(' ').length > lines.join(' ').length && lines.length === maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 25 ? `${last.slice(0, 24)}…` : `${last}…`;
  }
  return lines;
}

export function buildNewsImageSvg({ title, theme }) {
  const lines = wrapLines(title, 30, 3);
  const lineEls = lines
    .map(
      (ln, i) =>
        `<text x="80" y="${248 + i * 58}" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700">${escapeXml(ln)}</text>`,
    )
    .join('\n');

  const [c1, c2] = theme.bg;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)"/>
  <circle cx="1050" cy="120" r="180" fill="${theme.accent}" opacity="0.12"/>
  <circle cx="150" cy="520" r="120" fill="#ffffff" opacity="0.06"/>
  <rect x="0" y="${OG_HEIGHT - 88}" width="${OG_WIDTH}" height="88" fill="#061829" opacity="0.55"/>
  <rect x="80" y="72" width="200" height="44" rx="10" fill="url(#accent)" opacity="0.95"/>
  <text x="96" y="102" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800">NOVIXA</text>
  <rect x="292" y="78" width="auto" height="32" rx="16" fill="${theme.accent}" opacity="0.25"/>
  <text x="300" y="102" fill="${theme.accent}" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">${escapeXml(theme.label)}</text>
  ${lineEls}
  <text x="80" y="${OG_HEIGHT - 34}" fill="#e2e8f0" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600">${escapeXml(BRAND_TAGLINE)}</text>
  <text x="80" y="188" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="20">novixa.vn</text>
</svg>`;
}

export function parseArticleFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[m[1]] = val;
  }
  return meta;
}

export function newsImagePublicPath(slug) {
  return `/images/tin-tuc/${slug}.png`;
}

export async function generateNewsImage({ slug, title, description = '' }) {
  if (!slug || !title) return null;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const theme = pickTheme(title, description);
  const svg = buildNewsImageSvg({ title, theme });
  const outPath = path.join(OUT_DIR, `${slug}.png`);

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    const svgPath = path.join(OUT_DIR, `${slug}.svg`);
    fs.writeFileSync(svgPath, svg, 'utf8');
    console.warn(`sharp chưa cài — lưu SVG: ${path.basename(svgPath)}`);
    return svgPath;
  }

  const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();

  if (fs.existsSync(LOGO_PATH)) {
    try {
      const logo = await sharp(LOGO_PATH).resize(120, null).png().toBuffer();
      const meta = await sharp(png).metadata();
      const composed = await sharp(png)
        .composite([{ input: logo, top: 64, left: meta.width - 160 }])
        .png({ quality: 90 })
        .toBuffer();
      fs.writeFileSync(outPath, composed);
      return outPath;
    } catch {
      fs.writeFileSync(outPath, png);
      return outPath;
    }
  }

  fs.writeFileSync(outPath, png);
  return outPath;
}

export async function generateFromMarkdownFile(mdPath) {
  const slug = path.basename(mdPath, '.md');
  const raw = fs.readFileSync(mdPath, 'utf8');
  const meta = parseArticleFrontmatter(raw);
  if (!meta?.title) return null;
  return generateNewsImage({
    slug,
    title: meta.title,
    description: meta.description ?? '',
  });
}

export async function generateAllNewsImages() {
  const dir = path.join(ROOT, 'src/content/tin-tuc');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  let count = 0;
  for (const file of files) {
    const result = await generateFromMarkdownFile(path.join(dir, file));
    if (result) {
      count++;
      console.log(`  🖼 ${file.replace(/\.md$/, '.png')}`);
    }
  }
  console.log(`Ảnh tin tức: ${count}/${files.length} bài`);
  return count;
}
