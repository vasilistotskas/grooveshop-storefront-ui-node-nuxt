import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORAGE_KEY = 'recommendation-attribution'
const IMPRESSION = '3f9c2b6e-1d5a-4c8b-9e7f-2a1b3c4d5e6f'
const OTHER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

describe('useRecommendationAttribution', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-11T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hands back the impression a product was remembered under, once', () => {
    const { remember, take } = useRecommendationAttribution()

    remember(42, IMPRESSION)

    expect(take(42)).toBe(IMPRESSION)
    // Consumed: the next add of the same product carries nothing.
    expect(take(42)).toBeUndefined()
  })

  it('knows nothing about a product that was never remembered', () => {
    const { remember, take } = useRecommendationAttribution()

    remember(42, IMPRESSION)

    expect(take(7)).toBeUndefined()
    // And leaves the remembered one alone.
    expect(take(42)).toBe(IMPRESSION)
  })

  it('keeps the latest impression when a product is reached twice', () => {
    const { remember, take } = useRecommendationAttribution()

    remember(42, IMPRESSION)
    remember(42, OTHER)

    expect(take(42)).toBe(OTHER)
  })

  it('forgets an entry older than an hour', () => {
    const { remember, take } = useRecommendationAttribution()

    remember(42, IMPRESSION)
    vi.setSystemTime(new Date('2026-09-11T10:59:59Z'))
    remember(43, OTHER)
    vi.setSystemTime(new Date('2026-09-11T11:00:01Z'))

    expect(take(42)).toBeUndefined()
    expect(take(43)).toBe(OTHER)
  })

  it('survives a tab reload through sessionStorage', () => {
    useRecommendationAttribution().remember(42, IMPRESSION)

    // A fresh composable instance reads what the previous one wrote.
    expect(useRecommendationAttribution().take(42)).toBe(IMPRESSION)
  })

  it('clears the key once nothing is left to carry', () => {
    const { remember, take } = useRecommendationAttribution()

    remember(42, IMPRESSION)
    take(42)

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('treats corrupt storage as empty instead of throwing', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{not json')
    const { remember, take } = useRecommendationAttribution()

    expect(take(42)).toBeUndefined()
    remember(42, IMPRESSION)
    expect(take(42)).toBe(IMPRESSION)
  })

  it('degrades to nothing when storage is unavailable', () => {
    // A private window or blocked site data makes the accessor itself
    // throw — the composable must swallow that, not the add-to-cart.
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access is denied', 'SecurityError')
      },
    })
    try {
      const { remember, take } = useRecommendationAttribution()

      expect(() => remember(42, IMPRESSION)).not.toThrow()
      expect(take(42)).toBeUndefined()
    }
    finally {
      if (original) Object.defineProperty(window, 'sessionStorage', original)
      else Reflect.deleteProperty(window, 'sessionStorage')
    }
  })
})
