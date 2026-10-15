import { cloneElement, type ReactNode } from 'react'
import VocsRoot from 'vocs/waku/internal/routes/_root'

export { getConfig } from 'vocs/waku/internal/routes/_root'

// Pinned Vocs/RSC versions wrap the root in a Fragment with CSS resources.
// Keep those resources; set language on the inner HTML, not on the Fragment.
export default async function Root({ children }: { children: ReactNode }) {
  const shell = await VocsRoot({ children })
  const [resources, innerRoot] = shell.props.children
  const html = await innerRoot.type(innerRoot.props)
  return cloneElement(shell, {}, resources, cloneElement(html, { lang: 'es-419' }))
}
