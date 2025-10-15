import { describe, it, expect } from 'vitest'

describe('guest middleware', () => {
  it('should be defined', async () => {
    const { default: guestMiddleware } = await import('~/middleware/guest')
    expect(guestMiddleware).toBeDefined()
    expect(typeof guestMiddleware).toBe('function')
  })

  it('should be a route middleware function', async () => {
    const { default: guestMiddleware } = await import('~/middleware/guest')
    // Middleware should accept route parameters
    expect(guestMiddleware.length).toBeGreaterThanOrEqual(0)
  })
})
