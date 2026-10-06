/**
 * evlog's `/api/_evlog/ingest` is unauthenticated by design and, once the
 * client-drain plugin prints what it accepts, a way to write to our logs:
 * 60 events a minute per IP and store, a 429 past that, nothing else touched.
 */
import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/2.evlog-ingest-rate-limit'
import { callHandler, createTestEvent, useStorage } from '~~/test/helpers/nitro'

const INGEST = '/api/_evlog/ingest'

function hit(url: string, { method = 'POST', ip = '203.0.113.20', host }: { method?: string, ip?: string, host?: string } = {}) {
  return callHandler(middleware, createTestEvent({ url, method, host, headers: { 'cf-connecting-ip': ip } }))
}

describe('server/middleware/2.evlog-ingest-rate-limit', () => {
  it('lets the 60th event of a minute through and refuses the 61st with a 429', async () => {
    await useStorage('cache').setItem('rate:evlog-ingest:shop.test:203.0.113.21', 59)

    await expect(hit(INGEST, { ip: '203.0.113.21' })).resolves.toBeUndefined()
    await expect(hit(INGEST, { ip: '203.0.113.21' })).rejects.toMatchObject({ statusCode: 429 })
  })

  it('keeps a separate budget for another IP and for another store', async () => {
    await useStorage('cache').setItem('rate:evlog-ingest:shop.test:203.0.113.22', 60)

    await expect(hit(INGEST, { ip: '203.0.113.22' })).rejects.toMatchObject({ statusCode: 429 })
    await expect(hit(INGEST, { ip: '203.0.113.23' })).resolves.toBeUndefined()
    await expect(hit(INGEST, { ip: '203.0.113.22', host: 'other.test' })).resolves.toBeUndefined()
  })

  it('counts the query-stringed path too, and nothing but a POST to it', async () => {
    await useStorage('cache').setItem('rate:evlog-ingest:shop.test:203.0.113.24', 60)

    await expect(hit(`${INGEST}?x=1`, { ip: '203.0.113.24' })).rejects.toMatchObject({ statusCode: 429 })
    await expect(hit(INGEST, { ip: '203.0.113.24', method: 'GET' })).resolves.toBeUndefined()
    await expect(hit('/api/cart', { ip: '203.0.113.24' })).resolves.toBeUndefined()
  })
})
