import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { siteBase } from '../scripts/site-path.mjs'
import { LABS } from './catalog.mjs'

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  base: `${siteBase}labs/`,
  publicDir: false,
  plugins: [react()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    outDir: fileURLToPath(new URL('../.vocs-content/public/labs/', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: Object.fromEntries(LABS.map(({ slug }) => [slug, fileURLToPath(new URL(`${slug}/index.html`, import.meta.url))])),
    },
  },
})
