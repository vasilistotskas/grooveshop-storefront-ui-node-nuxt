import {
  tryCookieLocale,
  tryQueryLocale,
  tryHeaderLocale,
} from '@intlify/utils/h3'

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  nitroApp.hooks.hook('request', async (event) => {
    let locale: string = ''
    const url = event.node.req.url

    if (!url || !url.startsWith('/api/')) {
      return
    }

    const query = tryQueryLocale(event, { lang: '' })
    if (query && !locale) {
      locale = query.toString()
    }

    const cookie = tryCookieLocale(event, { lang: '', name: 'i18n_redirected' })
    if (cookie && !locale) {
      locale = cookie.toString()
    }

    const header = tryHeaderLocale(event, { lang: '' })
    if (header && !locale) {
      locale = header.toString()
    }

    if (!locale) {
      locale = config.public.defaultLocale || 'el'
    }

    if (!url.includes('?')) {
      event.context.language = locale
    }
    else {
      event.context.language = locale
    }
  })
})
