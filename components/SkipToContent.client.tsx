'use client'

import { useConfig, useRouter } from 'vocs'

// Vocs 2.10.3 omits basePath from its native skip link. Keep native focus behavior.
export function SkipToContent({ className = '' }: { className?: string }) {
  const { basePath } = useConfig()
  const { path } = useRouter()
  return (
    <a
      className={`${className} vocs:sr-only vocs:focus:not-sr-only vocs:fixed vocs:top-3 vocs:left-3 vocs:z-50 vocs:bg-surface vocs:p-4 vocs:rounded-lg`}
      data-v-skip-to-content
      href={`${basePath.replace(/\/$/, '')}${path.split('#')[0]}#vocs-content`}
    >
      Ir al contenido
    </a>
  )
}
