import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import { defineConfig } from 'vocs/config'
import plainMarkdown from './scripts/plain-markdown.mjs'
import sidebar from './.vocs-content/sidebar.json' with { type: 'json' }

const basePath = process.env.VOCS_BASE_PATH || '/'

// Adapt rendered URLs and language, never editorial sources or code examples.
function bookMarkup() {
  return (tree) => {
    for (const node of tree.children) {
      if (node.type === 'element') node.properties.lang = 'es-419'
    }
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && typeof node.properties.src === 'string' && /^(?:\.\/)?images\//.test(node.properties.src)) {
        node.properties.src = `${basePath.replace(/\/$/, '')}/${node.properties.src.replace(/^\.\//, '')}`
      }
      if (node.tagName !== 'a' || typeof node.properties?.href !== 'string') return
      const href = node.properties.href
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href) || !/\.md(?:[?#]|$)/.test(href)) return
      const url = new URL(href, 'https://book.invalid/')
      node.properties.href = url.pathname.replace(/\.md$/, '').replace(/^\/intro$/, '/') + url.search + url.hash
    })
  }
}

export default defineConfig({
  title: 'Mastering Ethereum',
  titleTemplate: '%s · Mastering Ethereum es-419',
  description: 'Segunda edición en español latinoamericano. Prefacio y 17 capítulos traducidos; revisión y aprobación humana pendientes.',
  srcDir: '.vocs-content',
  renderStrategy: 'full-static',
  basePath,
  baseUrl: process.env.VOCS_BASE_URL || undefined,
  sidebar,
  banner: {
    content: 'Traducción completa al español latinoamericano, en revisión editorial. Algunas figuras conservan texto en inglés.',
    dismissable: false,
  },
  topNav: [
    { text: 'Guía editorial', link: '/TRANSLATION' },
    { text: 'Glosario', link: '/GLOSSARY' },
    { text: 'Repositorio', link: 'https://github.com/theredguild/ethereumbook-es' },
  ],
  head: { meta: { robots: 'noindex, nofollow', ogImage: false, twitterImage: false } },
  markdown: {
    format: 'md',
    remarkPlugins: [plainMarkdown],
    rehypePlugins: [
      [rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxFlowExpression', 'mdxTextExpression'] }],
      bookMarkup,
    ],
  },
})
