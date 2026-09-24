import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  zConfirmSubscriptionByTokenPath,
  zConfirmSubscriptionByTokenResponse,
  zGetNewsletterAvailabilityResponse,
  zSubscribeToNewsletterBody,
  zSubscribeToNewsletterResponse,
} from '../../../../shared/openapi/zod.gen'
import { newsletterConsentText } from '../../../../shared/i18n/newsletterConsent'

/**
 * The three newsletter proxies. What each must keep true:
 *
 * - subscribe: the browser supplies email + consent only; the consent
 *   SENTENCE is added server-side in the request's locale; the
 *   client-identity headers go upstream (Django records the IP as
 *   consent evidence and throttles on it); Django's 4xx/429 come back
 *   with their status for the band to show.
 * - availability: per-tenant cache key.
 * - confirm: POST with the identity headers; 400/410 passed through.
 */
const fetchMock = vi.fn()
const backendFetchMock = vi.fn()
const forwardMock = vi.fn(() => ({ __forwarded: true }))
const handleErrorMock = vi.fn((error: unknown) => {
  throw error
})
let validatedBody: unknown
let routerParams: Record<string, string> = {}
let cachedOptions: Record<string, unknown> | undefined
const IDENTITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Forwarded-Host': 'shop.example',
  'X-Real-IP': '203.0.113.9',
  'X-Origin-Verify': 'edge-secret',
  'User-Agent': 'Mozilla/5.0 (Test)',
  'X-Language': 'en',
}

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options: Record<string, unknown>) => {
  cachedOptions = options
  return fn
})
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))
vi.stubGlobal('readValidatedBody', async (
  _event: unknown,
  parse: (v: unknown) => unknown,
) => parse(validatedBody))
vi.stubGlobal('getValidatedRouterParams', async (
  _event: unknown,
  parse: (v: unknown) => unknown,
) => parse(routerParams))
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('useBackendFetch', () => backendFetchMock)
vi.stubGlobal('createHeaders', () => ({ ...IDENTITY_HEADERS }))
vi.stubGlobal('requestLocale', (event: { context?: { locale?: string } }) =>
  event?.context?.locale ?? 'el',
)
vi.stubGlobal('parseDataAs', async (data: unknown) => data)
vi.stubGlobal('forwardUpstreamClientError', forwardMock)
vi.stubGlobal('handleError', handleErrorMock)
vi.stubGlobal('tenantCacheKey', (event: { host: string }, key: string) => `${event.host}:${key}`)
vi.stubGlobal('zSubscribeToNewsletterBody', zSubscribeToNewsletterBody)
vi.stubGlobal('zSubscribeToNewsletterResponse', zSubscribeToNewsletterResponse)
vi.stubGlobal('zGetNewsletterAvailabilityResponse', zGetNewsletterAvailabilityResponse)
vi.stubGlobal('zConfirmSubscriptionByTokenPath', zConfirmSubscriptionByTokenPath)
vi.stubGlobal('zConfirmSubscriptionByTokenResponse', zConfirmSubscriptionByTokenResponse)

type Handler = (event: unknown) => Promise<unknown>
const subscribe = (await import('../../../../server/api/subscriptions/newsletter.post')).default as Handler
const availability = (await import('../../../../server/api/subscriptions/newsletter.get')).default as Handler
const availabilityOptions = cachedOptions
const confirm = (await import('../../../../server/api/subscriptions/confirm/[token].post')).default as Handler

const EN_EVENT = { context: { locale: 'en' } }

beforeEach(() => {
  fetchMock.mockReset()
  backendFetchMock.mockReset()
  forwardMock.mockClear()
  handleErrorMock.mockClear()
  validatedBody = { email: 'visitor@example.com', consent: true }
  routerParams = { token: 'a'.repeat(64) }
})

describe('POST /api/subscriptions/newsletter', () => {
  it('adds the consent sentence server-side, in the request locale', async () => {
    fetchMock.mockResolvedValue({ detail: 'Check your inbox.' })

    const result = await subscribe(EN_EVENT)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('http://django/api/v1/user/subscription/newsletter')
    expect(opts.method).toBe('POST')
    expect(opts.body).toEqual({
      email: 'visitor@example.com',
      consent: true,
      consentText: newsletterConsentText('en'),
    })
    expect(result).toEqual({ detail: 'Check your inbox.' })
  })

  it('stores the English sentence when the app states en in X-Language', async () => {
    // The whole path the form takes: `$api` sends the page locale in
    // X-Language, `1.locale.ts` turns it into `event.context.locale`,
    // and the route picks the consent sentence the label showed.
    vi.stubGlobal('getHeader', (event: { headers: Record<string, string> }, name: string) =>
      event.headers[name.toLowerCase()])
    const localeMiddleware = (await import('../../../../server/middleware/1.locale')).default as unknown as (event: unknown) => void
    const event = {
      path: '/api/subscriptions/newsletter',
      headers: { 'x-language': 'en' } as Record<string, string>,
      context: { tenant: { defaultLocale: 'el', availableLocales: ['el', 'en'] } } as Record<string, unknown>,
    }
    localeMiddleware(event)
    fetchMock.mockResolvedValue({ detail: 'ok' })

    await subscribe(event)

    const [, opts] = fetchMock.mock.calls[0] as [string, { body: { consentText: string } }]
    expect(opts.body.consentText).toBe(newsletterConsentText('en'))
  })

  it('uses the Greek sentence on a Greek request', async () => {
    fetchMock.mockResolvedValue({ detail: 'ok' })

    await subscribe({ context: { locale: 'el' } })

    const [, opts] = fetchMock.mock.calls[0] as [string, { body: { consentText: string } }]
    expect(opts.body.consentText).toBe(newsletterConsentText('el'))
    expect(opts.body.consentText).not.toBe(newsletterConsentText('en'))
  })

  it('ignores a consent sentence the browser tries to supply', async () => {
    validatedBody = {
      email: 'visitor@example.com',
      consent: true,
      consentText: 'I agree to nothing in particular.',
    }
    fetchMock.mockResolvedValue({ detail: 'ok' })

    await subscribe(EN_EVENT)

    const [, opts] = fetchMock.mock.calls[0] as [string, { body: { consentText: string } }]
    expect(opts.body.consentText).toBe(newsletterConsentText('en'))
  })

  it('forwards the client-identity headers', async () => {
    fetchMock.mockResolvedValue({ detail: 'ok' })

    await subscribe(EN_EVENT)

    const [, opts] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(opts.headers).toEqual(IDENTITY_HEADERS)
  })

  it('rejects an invalid address before reaching Django', async () => {
    validatedBody = { email: 'not-an-email', consent: true }

    await subscribe(EN_EVENT)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(forwardMock).toHaveBeenCalledTimes(1)
  })

  it.each([400, 404, 429])('passes an upstream %i through', async (statusCode) => {
    const upstream = { statusCode, data: { detail: 'nope' } }
    fetchMock.mockRejectedValue(upstream)

    const result = await subscribe(EN_EVENT)

    expect(forwardMock).toHaveBeenCalledWith(upstream)
    expect(result).toEqual({ __forwarded: true })
  })
})

describe('GET /api/subscriptions/newsletter', () => {
  it('reads availability from the tenant backend, cached per tenant', async () => {
    backendFetchMock.mockResolvedValue({ available: true })

    const result = await availability({})

    expect(backendFetchMock).toHaveBeenCalledWith(
      'http://django/api/v1/user/subscription/newsletter',
      { method: 'GET' },
    )
    expect(result).toEqual({ available: true })
    const getKey = availabilityOptions!.getKey as (event: unknown) => string
    expect(getKey({ host: 'a.shop' })).not.toBe(getKey({ host: 'b.shop' }))
    expect(availabilityOptions!.swr).toBe(true)
  })
})

describe('POST /api/subscriptions/confirm/[token]', () => {
  it('POSTs the token upstream with the identity headers', async () => {
    fetchMock.mockResolvedValue({ status: 'confirmed', topic: 'News' })

    const result = await confirm({})

    const [url, opts] = fetchMock.mock.calls[0] as [string, { method: string, headers: Record<string, string> }]
    expect(url).toBe(`http://django/api/v1/user/subscription/confirm/${'a'.repeat(64)}`)
    expect(opts.method).toBe('POST')
    expect(opts.headers).toEqual(IDENTITY_HEADERS)
    expect(result).toEqual({ status: 'confirmed', topic: 'News' })
  })

  it('encodes the token into a single path segment', async () => {
    routerParams = { token: '../account' }
    fetchMock.mockResolvedValue({ status: 'confirmed' })

    await confirm({})

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('http://django/api/v1/user/subscription/confirm/..%2Faccount')
  })

  it.each([400, 410])('passes an upstream %i through', async (statusCode) => {
    const upstream = { statusCode, data: { detail: 'nope' } }
    fetchMock.mockRejectedValue(upstream)

    const result = await confirm({})

    expect(forwardMock).toHaveBeenCalledWith(upstream)
    expect(result).toEqual({ __forwarded: true })
  })
})
