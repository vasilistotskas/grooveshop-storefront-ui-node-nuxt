export const site = {
  url: process.env.NUXT_PUBLIC_SITE_URL || 'https://grooveshop.site',
  name: process.env.NUXT_PUBLIC_SITE_NAME || 'Grooveshop',
  description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Grooveshop',
  defaultLocale: process.env.NUXT_PUBLIC_DEFAULT_LOCALE || 'en',
}
