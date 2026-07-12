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
      filter: (page) => {
        try {
          const path = new URL(page).pathname;
          if (path === '/') return false;
          if (path.includes('/404')) return false;
          if (path.includes('/thong-ke')) return false;
          if (path.includes('/health-check')) return false;
          return true;
        } catch {
          return false;
        }
      },
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
