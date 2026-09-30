/**
 * Unit tests for server/middleware/1.locale.ts
 *
 * The locale is the PAGE's: a page request's path prefix, or the
 * `X-Language` the app's fetcher states on an `/api` request — clamped
 * by `servedLocale`. Cookies, `Accept-Language` and `?locale=` are no
 * longer sources.
 */
import { describe, it, expect } from 'vitest'
import middleware from '~~/server/middleware/1.locale'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'

type Tenant = { defaultLocale?: string, availableLocales?: string[] }

async function run(url: string, tenant?: Tenant, headers: Record<string, string> = {}): Promise<unknown> {
  const event = createTestEvent({ url, headers, context: tenant ? { tenant } : {} })
  await callHandler(middleware, event)
  return event.context.locale
}

const BILINGUAL: Tenant = { defaultLocale: 'el', availableLocales: ['el', 'en'] }

describe('1.locale middleware', () => {
  it('skips locale detection for /_nuxt paths', async () => {
    expect(await run('/_nuxt/chunk.js')).toBeUndefined()
  })

  describe('page requests take the locale from the path', () => {
    it('/ renders the default locale', async () => {
      expect(await run('/', BILINGUAL)).toBe('el')
    })

    it('/en/... renders en', async () => {
      expect(await run('/en/products/1', BILINGUAL)).toBe('en')
      expect(await run('/en', BILINGUAL)).toBe('en')
    })

    it('ignores the query string when reading the prefix', async () => {
      expect(await run('/en?utm_source=x', BILINGUAL)).toBe('en')
    })

    it('a prefix the tenant does not serve is not rendered as itself', async () => {
      expect(await run('/en/products', { defaultLocale: 'el' })).toBe('el')
    })

    it('an en-default store still renders `/` in el — what the page actually renders', async () => {
      expect(await run('/', { defaultLocale: 'en', availableLocales: ['en'] })).toBe('el')
    })
  })

  describe('/api requests take the locale from X-Language', () => {
    it('uses the stated page locale', async () => {
      expect(await run('/api/products/1', BILINGUAL, { 'x-language': 'en' })).toBe('en')
    })

    it('a missing header gets the clamp\'s answer', async () => {
      expect(await run('/api/products/1', BILINGUAL)).toBe('el')
    })

    it('an unknown or unserved header gets the clamp\'s answer', async () => {
      expect(await run('/api/products/1', BILINGUAL, { 'x-language': 'fr' })).toBe('el')
      expect(await run('/api/products/1', { defaultLocale: 'el' }, { 'x-language': 'en' })).toBe('el')
    })
  })

  describe('former sources no longer decide', () => {
    it('a stale i18n cookie does not override the path', async () => {
      expect(await run('/', BILINGUAL, { cookie: 'i18n_redirected=en; i18n_locale=en' })).toBe('el')
    })

    it('Accept-Language does not override the path or the header', async () => {
      expect(await run('/', BILINGUAL, { 'accept-language': 'en-US,en;q=0.9' })).toBe('el')
      expect(await run('/api/products/1', BILINGUAL, { 'accept-language': 'en-US', 'x-language': 'el' })).toBe('el')
    })

    it('?locale= does not override the path or the header', async () => {
      expect(await run('/?locale=en', BILINGUAL)).toBe('el')
      expect(await run('/api/subscriptions/newsletter?locale=en', BILINGUAL)).toBe('el')
    })
  })
})
