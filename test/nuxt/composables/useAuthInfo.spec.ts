import { describe, it, expect } from 'vitest'

describe('useAuthInfo', () => {
  it('should be a function', () => {
    expect(typeof useAuthInfo).toBe('function')
  })

  it('should return auth info object', () => {
    const result = useAuthInfo()

    expect(result).toBeDefined()
    expect(result).toHaveProperty('isAuthenticated')
    expect(result).toHaveProperty('requiresReauthentication')
    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('pendingFlow')
  })

  it('should return boolean for isAuthenticated', () => {
    const result = useAuthInfo()

    expect(typeof result.isAuthenticated).toBe('boolean')
  })

  it('should return boolean for requiresReauthentication', () => {
    const result = useAuthInfo()

    expect(typeof result.requiresReauthentication).toBe('boolean')
  })
})
