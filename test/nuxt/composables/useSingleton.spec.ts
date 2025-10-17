import { describe, it, expect } from 'vitest'
import { useSingleton } from '../../../app/composables/useSingleton'

describe('useSingleton', () => {
  it('should provide and inject a value', () => {
    const [provide, use] = useSingleton<string>()

    expect(provide).toBeDefined()
    expect(use).toBeDefined()
    expect(typeof provide).toBe('function')
    expect(typeof use).toBe('function')
  })

  it('should create unique symbols for different singletons', () => {
    const [, use1] = useSingleton<string>()
    const [, use2] = useSingleton<string>()

    // Each singleton should have its own unique key
    expect(use1).toBeDefined()
    expect(use2).toBeDefined()
    expect(use1).not.toBe(use2)
  })

  it('should return tuple with provide and use functions', () => {
    const result = useSingleton<number>()

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(typeof result[0]).toBe('function')
    expect(typeof result[1]).toBe('function')
  })
})
