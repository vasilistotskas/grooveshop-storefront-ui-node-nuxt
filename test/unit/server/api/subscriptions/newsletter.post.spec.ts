/**
 * The browser supplies email + consent only; the consent SENTENCE is
 * added server-side in the request's locale; the client-identity headers
 * go upstream (Django records the IP as consent evidence and throttles
 * on it); Django's 4xx/429 come back with their status for the band.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/subscriptions/newsletter.post'
import { newsletterConsentText } from '~~/shared/i18n/newsletterConsent'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/subscriptions/newsletter'

const subscribe = (body: unknown, locale = 'en', headers: Record<string, string> = {}) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers,
  context: { locale },
})

describe('POST /api/subscriptions/newsletter', () => {
  it('adds the consent sentence server-side, in the request locale', async () => {
    backend.reply({ detail: 'Check your inbox.' })

    const response = await subscribe({ email: 'visitor@example.com', consent: true })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ detail: 'Check your inbox.' })
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/user/subscription/newsletter',
      method: 'POST',
      body: { email: 'visitor@example.com', consent: true, consentText: newsletterConsentText('en') },
    })
  })

  it('uses the Greek sentence on a Greek request', async () => {
    backend.reply({ detail: 'ok' })

    await subscribe({ email: 'visitor@example.com', consent: true }, 'el')

    expect(backend.lastRequest.body.consentText).toBe(newsletterConsentText('el'))
    expect(newsletterConsentText('el')).not.toBe(newsletterConsentText('en'))
  })

  it('ignores a consent sentence the browser tries to supply', async () => {
    backend.reply({ detail: 'ok' })

    await subscribe({ email: 'visitor@example.com', consent: true, consentText: 'I agree to nothing in particular.' })

    expect(backend.lastRequest.body.consentText).toBe(newsletterConsentText('en'))
  })

  it('forwards the visitor\'s identity and the store the request is on', async () => {
    backend.reply({ detail: 'ok' })

    await subscribe({ email: 'visitor@example.com', consent: true }, 'en', {
      'cf-connecting-ip': '203.0.113.9',
      'x-origin-verify': 'edge-secret',
      'user-agent': 'Mozilla/5.0 (Test)',
      'x-forwarded-host': 'evil.example',
    })

    const sent = backend.lastRequest.headers
    expect(sent.get('x-real-ip')).toBe('203.0.113.9')
    expect(sent.get('x-origin-verify')).toBe('edge-secret')
    expect(sent.get('user-agent')).toBe('Mozilla/5.0 (Test)')
    expect(sent.get('x-language')).toBe('en')
    expect(sent.get('x-forwarded-host')).toBe('shop.test')
  })

  it('rejects an invalid address before reaching Django', async () => {
    const response = await subscribe({ email: 'not-an-email', consent: true })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it.each([400, 404, 429])('returns an upstream %i with its body', async (status) => {
    backend.reply(jsonResponse({ detail: 'nope' }, status))

    const response = await subscribe({ email: 'visitor@example.com', consent: true })

    expect(response.status).toBe(status)
    expect(response.body).toEqual({ detail: 'nope' })
  })
})
