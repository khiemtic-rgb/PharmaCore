import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://novixa.vn',
  // Cloudflare Pages serves directory indexes at `/path/` and 308-redirects `/path` → `/path/`.
  // Keep trailingSlash=always so canonical + sitemap match the live URL Google actually crawls.
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/thong-ke'),
    }),
  ],
  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
