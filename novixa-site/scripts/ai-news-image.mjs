/**
 * Sinh ảnh bài tin qua OpenAI Images — mỗi bài một scene khác nhau.
 * Logic chính nằm ở scripts/lib/openai-news.mjs (fallback đa model).
 */
import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR, ROOT } from './news-image-lib.mjs';
import { generateNewsHeroImage } from './lib/openai-news.mjs';

export async function generateAiNewsImage({ slug, title, description = '', force = false }) {
  return generateNewsHeroImage({ slug, title, description, force });
}

export async function generateAllAiNewsImages({ force = false } = {}) {
  const dir = path.join(ROOT, 'src/content/tin-tuc');
  const { parseArticleFrontmatter } = await import('./news-image-lib.mjs');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  let ok = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const meta = parseArticleFrontmatter(raw);
    if (!meta?.title) continue;

    const result = await generateNewsHeroImage({
      slug,
      title: meta.title,
      description: meta.description ?? '',
      force,
    });

    if (result.ok && result.skipped) {
      skipped++;
      console.log(`  skip ${slug}.png (OpenAI, đã có)`);
    } else if (result.ok) {
      ok++;
      console.log(`  OpenAI ${slug}.png`);
      await new Promise((r) => setTimeout(r, 3500));
    } else {
      errors.push({ slug, reason: result.reason });
      console.error(`  lỗi ${slug}: ${result.reason}`);
    }
  }

  console.log(`OpenAI ảnh tin tức: ${ok} mới, ${skipped} giữ nguyên, ${errors.length} lỗi / ${files.length} bài`);
  return { ok, skipped, errors, total: files.length };
}
