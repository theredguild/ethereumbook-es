import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { siteBase } from '../scripts/site-path.mjs'

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  base: `${siteBase}labs/`,
  publicDir: false,
  plugins: [react()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../.vocs-content/public/labs/', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: fileURLToPath(new URL('transactions/index.html', import.meta.url)),
    },
  },
})
