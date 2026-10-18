import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vocs } from 'vocs/vite'
import { siteBase } from './scripts/site-path.mjs'

export default defineConfig({
  plugins: [
    {
      name: 'lab-static-entry',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const url = new URL(request.url || '/', 'http://dev.invalid')
          const entry = `${siteBase}labs/transactions`
          if (url.pathname === entry || url.pathname === `${entry}/`) {
            request.url = `${entry}/index.html${url.search}`
          }
          next()
        })
      },
    },
    react(),
    vocs(),
  ],
  publicDir: '.vocs-content/public',
  resolve: {
    alias: {
      './internal/SkipToContent.client.js': fileURLToPath(new URL('./components/SkipToContent.client.tsx', import.meta.url)),
    },
  },
})
