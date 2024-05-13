export const routeRules = {
  '/**': process.client
    ? {}
    : { cache: { swr: true, maxAge: 120, staleMaxAge: 60, headersOnly: true } },
  '/products': { swr: true },
  '/products/**': { swr: 3600 },
  '/blog': { isr: 3600 },
  '/blog/**': { isr: true },
  '/api/**': { cors: true },
  '/manifest.webmanifest': {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  },
  '/favicon.ico': {
    cache: {
      maxAge: 60 * 60 * 24 * 365,
    },
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'max-age=31536000',
    },
  },
  '/favicon/**': {
    cache: {
      maxAge: 60 * 60 * 24 * 365,
    },
    headers: {
      'Cache-Control': 'max-age=31536000',
    },
  },
  'img/**': {
    cache: {
      maxAge: 60 * 60 * 24 * 365,
    },
    headers: {
      'Cache-Control': 'max-age=31536000',
    },
  },
  '/screenshots/**': {
    cache: {
      maxAge: 60 * 60 * 24 * 365,
    },
    headers: {
      'Cache-Control': 'max-age=31536000',
    },
  },
}
