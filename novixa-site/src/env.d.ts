/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CF_WEB_ANALYTICS_TOKEN?: string;
  readonly STATS_VIEW_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
