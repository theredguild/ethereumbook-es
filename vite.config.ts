import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vocs } from 'vocs/vite'

export default defineConfig({
  plugins: [react(), vocs()],
  publicDir: '.vocs-content/public',
  resolve: {
    alias: {
      './internal/SkipToContent.client.js': fileURLToPath(new URL('./components/SkipToContent.client.tsx', import.meta.url)),
    },
  },
})
