import type { NitroConfig } from 'nitropack'

export const nitro = {
  routeRules: {},
  compressPublicAssets: { gzip: true },
  prerender: {
    crawlLinks: false,
    routes: [],
    ignore: ['/api', '/account', '/auth', '/checkout', '/cart'],
  },
  experimental: {
    asyncContext: true,
  },
  publicAssets: [
    {
      baseURL: 'assets',
      dir: 'public/assets',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  ],
} satisfies NitroConfig
