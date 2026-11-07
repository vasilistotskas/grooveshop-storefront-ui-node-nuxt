/**
 * evlog's `/api/_evlog/ingest` is unauthenticated by design and, once the
 * ingest route prints what it accepts, a way to write to our logs:
 * 60 events a minute per IP and store, a 429 past that, nothing else touched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import middleware from '~~/server/middleware/2.evlog-ingest-rate-limit'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'

const INGEST = '/api/_evlog/ingest'

function hit(url: string, { method = 'POST', ip = '203.0.113.20', host }: { method?: string, ip?: string, host?: string } = {}) {
  return callHandler(middleware, createTestEvent({ url, method, host, headers: { 'cf-connecting-ip': ip } }))
}

/** Spend `count` of an IP's budget on the store with real events. */
async function spend(count: number, ip: string) {
  for (let i = 0; i < count; i++) await hit(INGEST, { ip })
}

describe('server/middleware/2.evlog-ingest-rate-limit', () => {
  beforeEach(() => {
    // The start of a minute: every event of a test falls in one window.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-07T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets the 60th event of a minute through and refuses the 61st with a 429', async () => {
    await spend(59, '203.0.113.21')

    await expect(hit(INGEST, { ip: '203.0.113.21' })).resolves.toBeUndefined()
    await expect(hit(INGEST, { ip: '203.0.113.21' })).rejects.toMatchObject({ statusCode: 429 })
  })

  it('keeps a separate budget for another IP and for another store', async () => {
    await spend(60, '203.0.113.22')

    await expect(hit(INGEST, { ip: '203.0.113.22' })).rejects.toMatchObject({ statusCode: 429 })
    await expect(hit(INGEST, { ip: '203.0.113.23' })).resolves.toBeUndefined()
    await expect(hit(INGEST, { ip: '203.0.113.22', host: 'other.test' })).resolves.toBeUndefined()
  })

  it('counts the query-stringed path too, and nothing but a POST to it', async () => {
    await spend(60, '203.0.113.24')

    await expect(hit(`${INGEST}?x=1`, { ip: '203.0.113.24' })).rejects.toMatchObject({ statusCode: 429 })
    await expect(hit(INGEST, { ip: '203.0.113.24', method: 'GET' })).resolves.toBeUndefined()
    await expect(hit('/api/cart', { ip: '203.0.113.24' })).resolves.toBeUndefined()
  })

  it('accepts events again once the minute turns', async () => {
    await spend(60, '203.0.113.25')
    await expect(hit(INGEST, { ip: '203.0.113.25' })).rejects.toMatchObject({ statusCode: 429 })

    vi.setSystemTime(new Date('2026-11-07T12:01:00Z'))

    await expect(hit(INGEST, { ip: '203.0.113.25' })).resolves.toBeUndefined()
  })
})
