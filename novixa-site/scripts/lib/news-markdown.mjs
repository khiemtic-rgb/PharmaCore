import fs from 'node:fs';
import path from 'node:path';

export const PLACEHOLDER_VI = 'Nội dung đang được hoàn thiện';

export function isRealBody(body) {
  const trimmed = String(body ?? '').trim();
  if (!trimmed) return false;
  if (trimmed.includes(PLACEHOLDER_VI)) return false;
  return trimmed.length > 200;
}

export function yamlEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function parseNewsMarkdown(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const block = match[1];
  const body = match[2] ?? '';
  const title = block.match(/^title:\s*"(.*)"/m)?.[1];
  const description = block.match(/^description:\s*"(.*)"/m)?.[1];
  const pubDate = block.match(/^pubDate:\s*(\S+)/m)?.[1];
  const lang = block.match(/^lang:\s*(\S+)/m)?.[1] ?? 'vi';

  if (!title) return null;
  return {
    frontmatter: { title, description: description ?? '', pubDate: pubDate ?? '', lang },
    body,
  };
}

export function readNewsMarkdown(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return parseNewsMarkdown(fs.readFileSync(filePath, 'utf8'));
}

export function writeNewsMarkdown(filePath, frontmatter, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = `---
title: "${yamlEscape(frontmatter.title)}"
description: "${yamlEscape(frontmatter.description)}"
pubDate: ${frontmatter.pubDate}
lang: ${frontmatter.lang ?? 'vi'}
---

${String(body).trim()}
`;
  fs.writeFileSync(filePath, content, 'utf8');
}

export function newsMarkdownPath(contentDir, slug) {
  return path.join(contentDir, `${slug}.md`);
}
