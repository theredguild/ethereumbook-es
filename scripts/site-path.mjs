const subpath = (process.env.VOCS_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')

// Book and standalone lab assets use the same trailing-slash base.
export const siteBase = subpath ? `/${subpath}/` : '/'
