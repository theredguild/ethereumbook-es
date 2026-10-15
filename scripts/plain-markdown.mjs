import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter).freeze()

// Vocs 2.10.3 forces MDX in search and Markdown exports, even for .md files.
// Use one plain Markdown parser for rendering, search, and exports. Never parse examples as JSX.
export default function plainMarkdown() {
  this.use(remarkGfm).use(remarkFrontmatter)
  this.parser = markdown.parser
}
