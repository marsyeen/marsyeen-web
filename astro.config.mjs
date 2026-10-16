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

  // 'compile' resizes images at build time into plain static files, so they work on a static
  // Cloudflare Pages deploy (the default needs a live Cloudflare Images binding to serve /_image)
  adapter: cloudflare({ imageService: 'compile' })
});
