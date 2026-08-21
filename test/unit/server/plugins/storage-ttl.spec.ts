/**
 * Nitro derives a cache entry's storage TTL from the handler's `maxAge`,
 * and a handler may legitimately register a non-positive one to mean
 * "do not cache". Redis has no such concept — `SET … EX -1` is rejected
 * with `ERR invalid expire time in 'set' command`.
 *
 * @nuxtjs/i18n 10.6.0 does exactly that: its messages handler is
 * registered with `maxAge: !__I18N_CACHE__ ? -1 : …`, so disabling
 * message caching made every SSR message load attempt an invalid write.
 * Observed in production 2026-08-21 as a failed Redis round-trip plus a
 * `[cache] Cache write error` on each request.
 */
import type { Driver } from 'unstorage'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// storage.ts is a Nitro plugin: importing it evaluates the module's
// auto-imported globals. Stub them before the dynamic import below.
vi.stubGlobal('defineNitroPlugin', (fn: unknown) => fn)
vi.stubGlobal('useStorage', () => ({ mount: vi.fn(), unmount: vi.fn(async () => {}) }))
vi.stubGlobal('useRuntimeConfig', () => ({ redis: {}, cacheBase: 'memory' }))
vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const { withoutNonPositiveTtlWrites } = await import(
  '../../../../server/plugins/storage'
)

function makeDriver() {
  return {
    name: 'stub',
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    getKeys: vi.fn(async () => []),
    clear: vi.fn(async () => {}),
  } as unknown as Driver & { setItem: ReturnType<typeof vi.fn>, getItem: ReturnType<typeof vi.fn>, removeItem: ReturnType<typeof vi.fn> }
}

describe('withoutNonPositiveTtlWrites', () => {
  let inner: ReturnType<typeof makeDriver>
  let wrapped: Driver

  beforeEach(() => {
    inner = makeDriver()
    wrapped = withoutNonPositiveTtlWrites(inner)
  })

  it.each([-1, 0, -3600])('skips the write when ttl is %s', async (ttl) => {
    await wrapped.setItem?.('cache:nitro:handlers:i18n:messages:el.json', 'x', { ttl } as never)
    expect(inner.setItem).not.toHaveBeenCalled()
  })

  it('forwards writes with a positive ttl', async () => {
    await wrapped.setItem?.('k', 'v', { ttl: 60 } as never)
    expect(inner.setItem).toHaveBeenCalledTimes(1)
  })

  it('forwards writes with no ttl at all', async () => {
    await wrapped.setItem?.('k', 'v', {} as never)
    expect(inner.setItem).toHaveBeenCalledTimes(1)
  })

  it('leaves reads and deletes untouched', async () => {
    await wrapped.getItem?.('k', {} as never)
    await wrapped.removeItem?.('k', {} as never)
    expect(inner.getItem).toHaveBeenCalledTimes(1)
    expect(inner.removeItem).toHaveBeenCalledTimes(1)
  })
})
