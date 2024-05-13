export const routeRules = {
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
