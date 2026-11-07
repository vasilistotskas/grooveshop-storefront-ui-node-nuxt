import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enforceRateLimit } from '~~/server/utils/rateLimit'
import { createRequestEvent } from '~~/test/helpers/nitro'

/**
 * The per-IP, per-store budget in front of the browser-log ingest, the
 * cookie-consent record and the recommendation beacon. Each window of
 * `windowSeconds` allows `maxRequests`, and the next window starts from
 * zero, however steady the traffic. A single key whose TTL every hit
 * refreshed never ended a window: a tab sending twelve requests a minute
 * was refused a minute at a time, around the clock (storefront #414).
 */
const LIMIT = { name: 'test-limit', windowSeconds: 60, maxRequests: 60 }

function requestFrom(ip: string, host = 'shop.test') {
  return createRequestEvent({ host, headers: { 'cf-connecting-ip': ip } })
}

/** Send `count` requests and say how many were refused with a 429; any other failure fails the test. */
async function refusedOf(count: number, ip = '203.0.113.1', host = 'shop.test'): Promise<number> {
  let refused = 0
  for (let i = 0; i < count; i++) {
    try {
      await enforceRateLimit(requestFrom(ip, host), LIMIT)
    }
    catch (error) {
      if ((error as { status?: number }).status !== 429) throw error
      refused++
    }
  }
  return refused
}

describe('enforceRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // The start of a window, so a test's requests all fall in one.
    vi.setSystemTime(new Date('2026-11-07T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a window\'s budget through and refuses the request after it', async () => {
    expect(await refusedOf(60)).toBe(0)
    expect(await refusedOf(1)).toBe(1)
  })

  it('starts the next window from zero', async () => {
    await refusedOf(61)

    vi.setSystemTime(new Date('2026-11-07T12:01:00Z'))

    expect(await refusedOf(60)).toBe(0)
  })

  it('never refuses steady traffic below the budget, however long it lasts', async () => {
    let refused = 0
    // Twelve requests a minute, every five seconds, for an hour.
    for (let second = 0; second < 3600; second += 5) {
      vi.setSystemTime(new Date(Date.UTC(2026, 10, 7, 12, 0, second)))
      refused += await refusedOf(1)
    }

    expect(refused).toBe(0)
  })

  it('keeps one visitor\'s budget apart from another\'s, and one store\'s from another\'s', async () => {
    await refusedOf(61, '203.0.113.1', 'shop.test')

    expect(await refusedOf(1, '203.0.113.2', 'shop.test')).toBe(0)
    expect(await refusedOf(1, '203.0.113.1', 'other.test')).toBe(0)
  })
})
