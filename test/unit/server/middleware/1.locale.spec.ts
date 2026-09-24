/**
 * Unit tests for server/middleware/1.locale.ts
 *
 * The locale is the PAGE's: a page request's path prefix, or the
 * `X-Language` the app's fetcher states on an `/api` request — clamped
 * by `servedLocale`. Cookies, `Accept-Language` and `?locale=` are no
 * longer sources.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const headers = vi.hoisted(() => ({ value: {} as Record<string, string> }))
vi.stubGlobal('getHeader', (_event: unknown, name: string) => headers.value[name.toLowerCase()])
vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

const module = await import('../../../../server/middleware/1.locale')
const handler = (module.default ?? module) as unknown as (event: unknown) => void

type Tenant = { defaultLocale?: string, availableLocales?: string[] }

function run(path: string, tenant?: Tenant, requestHeaders: Record<string, string> = {}): unknown {
  headers.value = requestHeaders
  const event = { path, context: tenant ? { tenant } : {} as Record<string, unknown> }
  handler(event)
  return (event.context as Record<string, unknown>).locale
}

const BILINGUAL: Tenant = { defaultLocale: 'el', availableLocales: ['el', 'en'] }

describe('1.locale middleware', () => {
  beforeEach(() => {
    headers.value = {}
  })

  it('skips locale detection for /_nuxt paths', () => {
    expect(run('/_nuxt/chunk.js')).toBeUndefined()
  })

  describe('page requests take the locale from the path', () => {
    it('/ renders the default locale', () => {
      expect(run('/', BILINGUAL)).toBe('el')
    })

    it('/en/... renders en', () => {
      expect(run('/en/products/1', BILINGUAL)).toBe('en')
      expect(run('/en', BILINGUAL)).toBe('en')
    })

    it('ignores the query string when reading the prefix', () => {
      expect(run('/en?utm_source=x', BILINGUAL)).toBe('en')
    })

    it('a prefix the tenant does not serve is not rendered as itself', () => {
      expect(run('/en/products', { defaultLocale: 'el' })).toBe('el')
    })

    it('an en-default store still renders `/` in el — what the page actually renders', () => {
      expect(run('/', { defaultLocale: 'en', availableLocales: ['en'] })).toBe('el')
    })
  })

  describe('/api requests take the locale from X-Language', () => {
    it('uses the stated page locale', () => {
      expect(run('/api/products/1', BILINGUAL, { 'x-language': 'en' })).toBe('en')
    })

    it('a missing header gets the clamp\'s answer', () => {
      expect(run('/api/products/1', BILINGUAL)).toBe('el')
    })

    it('an unknown or unserved header gets the clamp\'s answer', () => {
      expect(run('/api/products/1', BILINGUAL, { 'x-language': 'fr' })).toBe('el')
      expect(run('/api/products/1', { defaultLocale: 'el' }, { 'x-language': 'en' })).toBe('el')
    })
  })

  describe('former sources no longer decide', () => {
    it('a stale i18n cookie does not override the path', () => {
      expect(run('/', BILINGUAL, { cookie: 'i18n_redirected=en; i18n_locale=en' })).toBe('el')
    })

    it('Accept-Language does not override the path or the header', () => {
      expect(run('/', BILINGUAL, { 'accept-language': 'en-US,en;q=0.9' })).toBe('el')
      expect(run('/api/products/1', BILINGUAL, { 'accept-language': 'en-US', 'x-language': 'el' })).toBe('el')
    })

    it('?locale= does not override the path or the header', () => {
      expect(run('/?locale=en', BILINGUAL)).toBe('el')
      expect(run('/api/subscriptions/newsletter?locale=en', BILINGUAL)).toBe('el')
    })
  })
})
