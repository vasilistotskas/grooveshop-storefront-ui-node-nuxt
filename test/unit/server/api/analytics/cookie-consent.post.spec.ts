import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/analytics/cookie-consent.post'
import { callRoute, useStorage } from '~~/test/helpers/nitro'

/**
 * POST /api/analytics/cookie-consent: records the consent banner's
 * events on the request's wide event (no backend call), behind a per-IP
 * limit of 30 a minute that is kept separately for every store.
 */

const route = '/api/analytics/cookie-consent'

const send = (body: unknown, headers: Record<string, string> = {}) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: { 'cf-connecting-ip': '203.0.113.9', ...headers },
})

describe('POST /api/analytics/cookie-consent', () => {
  it('records that the banner was shown', async () => {
    const response = await send({ event: 'banner_shown' })

    expect(response.status).toBe(204)
    expect(response.logger.fields).toEqual({ cookies: { event: 'banner_shown' } })
  })

  it('records the decision and the categories it enabled', async () => {
    const response = await send({ event: 'consent_decision', decision: 'accept_partial', enabledIds: ['necessary', 'analytics'] })

    expect(response.status).toBe(204)
    expect(response.logger.fields).toEqual({
      cookies: { event: 'consent_decision', decision: 'accept_partial', enabled_ids: ['necessary', 'analytics'], enabled_count: 2 },
    })
  })

  it('rejects an event the schema does not know', async () => {
    const response = await send({ event: 'consent_decision', decision: 'maybe', enabledIds: [] })

    expect(response.status).toBe(400)
  })

  it('refuses the 31st event from one IP on one store, but not on another store', async () => {
    await useStorage('cache').setItem('rate:cookie-consent:shop.test:203.0.113.9', 30)

    const limited = await send({ event: 'banner_shown' }, { 'x-forwarded-host': 'other.test' })
    const otherStore = await callRoute(handler, { route, method: 'POST', host: 'other.test', body: { event: 'banner_shown' }, headers: { 'cf-connecting-ip': '203.0.113.9' } })

    expect(limited.status).toBe(429)
    expect(otherStore.status).toBe(204)
  })
})
