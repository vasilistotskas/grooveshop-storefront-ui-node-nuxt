import type { NitroConfig } from 'nitropack'

export const nitro = {
  routeRules: {},
  compressPublicAssets: { gzip: true },
  prerender: {
    crawlLinks: false,
    routes: ['/'],
    ignore: ['/api', '/account', '/auth', '/checkout', '/cart'],
  },
  experimental: {
    asyncContext: true,
  },
} satisfies NitroConfig
