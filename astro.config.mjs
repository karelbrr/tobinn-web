import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://tobinn.cz',
  i18n: {
    locales: ['en', 'cs'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    markdoc(),
    sitemap({
      filter: (page) => !/\/(privacy|terms)\/?$/.test(page),
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          cs: 'cs',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
