import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Mock useTenantStore so we control loyaltyEnabled per test.
const mockLoyaltyEnabled = vi.fn(() => true)
mockNuxtImport('useTenantStore', () => () => ({
  get loyaltyEnabled() { return mockLoyaltyEnabled() },
}))

describe('loyalty-enabled middleware', () => {
  let originalFetch: typeof globalThis.$fetch

  beforeEach(() => {
    mockLoyaltyEnabled.mockReset()
    // Save the real $fetch and replace it with a controllable mock after
    // Nuxt has fully booted (this hook runs after the Nuxt beforeAll).
    originalFetch = globalThis.$fetch
  })

  afterEach(() => {
    // Restore $fetch so other tests are not polluted.
    globalThis.$fetch = originalFetch
  })

  it('is a route middleware function', async () => {
    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    expect(typeof middleware).toBe('function')
  })

  it('throws 404 immediately when tenant loyaltyEnabled is false', async () => {
    mockLoyaltyEnabled.mockReturnValue(false)
    // Replace $fetch so we can assert it is never called
    const fetchSpy = vi.fn().mockResolvedValue({ LOYALTY_ENABLED: 'true' })
    globalThis.$fetch = fetchSpy as typeof $fetch

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    await expect(middleware({} as any, {} as any)).rejects.toMatchObject({
      statusCode: 404,
    })
    // Bail-out must happen before the $fetch call
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws 404 when tenant flag is true but runtime settings disabled', async () => {
    mockLoyaltyEnabled.mockReturnValue(true)
    globalThis.$fetch = vi.fn().mockResolvedValue({ LOYALTY_ENABLED: 'false' }) as typeof $fetch

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    await expect(middleware({} as any, {} as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('passes through when tenant flag is true and runtime settings enabled', async () => {
    mockLoyaltyEnabled.mockReturnValue(true)
    globalThis.$fetch = vi.fn().mockResolvedValue({ LOYALTY_ENABLED: 'true' }) as typeof $fetch

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    await expect(middleware({} as any, {} as any)).resolves.toBeUndefined()
  })

  it('passes through on network error (fail-open for transient fetch failures)', async () => {
    mockLoyaltyEnabled.mockReturnValue(true)
    globalThis.$fetch = vi.fn().mockRejectedValue(new Error('network error')) as typeof $fetch

    const { default: middleware } = await import('~/middleware/loyalty-enabled')
    // Network errors are swallowed — should not throw
    await expect(middleware({} as any, {} as any)).resolves.toBeUndefined()
  })
})
