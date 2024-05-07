export const nitro = {
  preset: 'bun',
  routeRules: {},
  compressPublicAssets: { gzip: true },
  prerender: {
    crawlLinks: false,
    routes: [],
    ignore: ['/api', '/account', '/auth', '/checkout', '/cart'],
  },
}
