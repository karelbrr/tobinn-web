import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://tobinn.cz',
  integrations: [react(), markdoc(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});