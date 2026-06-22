import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://novixa.vn',
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
