import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vocs } from 'vocs/vite'
import { siteBase } from './scripts/site-path.mjs'
import { LABS } from './labs/catalog.mjs'

export default defineConfig({
  plugins: [
    {
      name: 'lab-static-entry',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const url = new URL(request.url || '/', 'http://dev.invalid')
          const lab = LABS.find(({ slug }) => url.pathname === `${siteBase}labs/${slug}` || url.pathname === `${siteBase}labs/${slug}/`)
          if (lab) request.url = `${siteBase}labs/${lab.slug}/index.html${url.search}`
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
