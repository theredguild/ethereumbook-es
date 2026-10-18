import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import { defineConfig } from 'vocs/config'
import plainMarkdown from './scripts/plain-markdown.mjs'
import { siteBase as basePath } from './scripts/site-path.mjs'
import sidebar from './.vocs-content/sidebar.json' with { type: 'json' }

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
      if (node.tagName === 'form' && typeof node.properties.action === 'string' && node.properties.action.startsWith('./labs/')) {
        node.properties.action = `${basePath}${node.properties.action.slice(2)}`
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
  iconUrl: `${basePath.replace(/\/$/, '')}/favicon.svg`,
  srcDir: '.vocs-content',
  renderStrategy: 'full-static',
  basePath,
  baseUrl: process.env.VOCS_BASE_URL || undefined,
  sidebar,
  banner: {
    content: 'Traducción al español latinoamericano con asistencia de IA. Revisión humana pendiente.',
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
