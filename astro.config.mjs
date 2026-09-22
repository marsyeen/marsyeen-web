// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
    // Stop Vite picking up a stray postcss.config.js from a parent folder (Tailwind v4 needs no PostCSS config)
    css: { postcss: { plugins: [] } }
  },

  adapter: cloudflare()
});
