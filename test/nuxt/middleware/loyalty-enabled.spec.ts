import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Mock useTenantStore so we control loyaltyEnabled per test.
const mockLoyaltyEnabled = vi.fn(() => true)
mockNuxtImport('useTenantStore', () => () => ({
  get loyaltyEnabled() { return mockLoyaltyEnabled() },
}))

// $fetch is a real auto-import in user code since Nuxt 4.5, so
// `globalThis.$fetch = mock`/`vi.stubGlobal('$fetch', mock)` no longer
// intercepts it — the middleware's `$fetch` binding bypasses globals
// entirely. Mock it like any other auto-import.
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

mockNuxtImport('$fetch', () => mockFetch)

describe('loyalty-enabled middleware', () => {
  beforeEach(() => {
    mockLoyaltyEnabled.mockReset()
    mockFetch.mockReset()
  })

  it('is a route middleware function', async () => {
    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    expect(typeof middleware).toBe('function')
  })

  it('throws 404 immediately when tenant loyaltyEnabled is false', async () => {
    mockLoyaltyEnabled.mockReturnValue(false)
    mockFetch.mockResolvedValue({ LOYALTY_ENABLED: 'true' })

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    await expect(middleware({} as any, {} as any)).rejects.toMatchObject({
      statusCode: 404,
    })
    // Bail-out must happen before the $fetch call
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws 404 when tenant flag is true but runtime settings disabled', async () => {
    mockLoyaltyEnabled.mockReturnValue(true)
    mockFetch.mockResolvedValue({ LOYALTY_ENABLED: 'false' })

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    await expect(middleware({} as any, {} as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('passes through when tenant flag is true and runtime settings enabled', async () => {
    mockLoyaltyEnabled.mockReturnValue(true)
    mockFetch.mockResolvedValue({ LOYALTY_ENABLED: 'true' })

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    await expect(middleware({} as any, {} as any)).resolves.toBeUndefined()
  })

  it('passes through on network error (fail-open for transient fetch failures)', async () => {
    mockLoyaltyEnabled.mockReturnValue(true)
    mockFetch.mockRejectedValue(new Error('network error'))

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    // Network errors are swallowed — should not throw
    await expect(middleware({} as any, {} as any)).resolves.toBeUndefined()
  })
})
