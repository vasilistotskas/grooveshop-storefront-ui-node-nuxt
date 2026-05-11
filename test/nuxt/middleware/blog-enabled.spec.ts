import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Mock useTenantStore so we control blogEnabled per test.
const mockBlogEnabled = vi.fn(() => true)
mockNuxtImport('useTenantStore', () => () => ({
  get blogEnabled() { return mockBlogEnabled() },
}))

describe('blog-enabled middleware', () => {
  beforeEach(() => {
    mockBlogEnabled.mockReset()
  })

  it('passes through when tenant blogEnabled is true', async () => {
    mockBlogEnabled.mockReturnValue(true)

    const { default: middleware } = await import('~/middleware/blog-enabled')
    // Should not throw
    await expect(Promise.resolve(middleware({} as any, {} as any))).resolves.toBeUndefined()
  })

  it('throws 404 when tenant blogEnabled is false', async () => {
    mockBlogEnabled.mockReturnValue(false)

    const { default: middleware } = await import('~/middleware/blog-enabled')
    expect(() => middleware({} as any, {} as any)).toThrow()

    // Verify it throws a createError-style object with statusCode 404
    try {
      middleware({} as any, {} as any)
    }
    catch (error: unknown) {
      expect(error).toMatchObject({ statusCode: 404 })
    }
  })
})
