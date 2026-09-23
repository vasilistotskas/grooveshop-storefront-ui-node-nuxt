/**
 * The cache client must reconnect after Redis comes back, however long
 * Redis was gone. ioredis stops reconnecting for good when `retryStrategy`
 * returns anything but a number; on 2026-09-23 a strategy that returned
 * `null` after three attempts left both storefront pods without a cache
 * for 54 minutes after a routine Redis restart.
 */
import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineNitroPlugin', (fn: unknown) => fn)
vi.stubGlobal('useStorage', () => ({ mount: vi.fn(), unmount: vi.fn(async () => {}) }))
vi.stubGlobal('useRuntimeConfig', () => ({ redis: {}, cacheBase: 'memory' }))
vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const { redisReconnectDelay } = await import('../../../../server/plugins/storage')

describe('redisReconnectDelay', () => {
  it('never gives up: every attempt gets a numeric delay', () => {
    for (const times of [1, 2, 3, 4, 10, 100, 10_000]) {
      expect(typeof redisReconnectDelay(times)).toBe('number')
    }
  })

  it('backs off linearly', () => {
    expect(redisReconnectDelay(1)).toBe(200)
    expect(redisReconnectDelay(3)).toBe(600)
  })

  it('caps the wait so a recovered Redis is picked up within seconds', () => {
    expect(redisReconnectDelay(10)).toBe(2000)
    expect(redisReconnectDelay(10_000)).toBe(2000)
  })
})
