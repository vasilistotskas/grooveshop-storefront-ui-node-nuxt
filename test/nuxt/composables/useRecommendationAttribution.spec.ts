import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

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

  /** A tile followed once its impression was answered. */
  const follow = async (productId: number, impressionId: string) => {
    useRecommendationAttribution().remember(productId, Promise.resolve(impressionId))
    await flushPromises()
  }

  it('hands back the impression a product was remembered under, once', async () => {
    const { take } = useRecommendationAttribution()

    await follow(42, IMPRESSION)

    expect(await take(42)).toBe(IMPRESSION)
    // Consumed: the next add of the same product carries nothing.
    expect(await take(42)).toBeUndefined()
  })

  it('knows nothing about a product that was never remembered', async () => {
    const { take } = useRecommendationAttribution()

    await follow(42, IMPRESSION)

    expect(await take(7)).toBeUndefined()
    // And leaves the remembered one alone.
    expect(await take(42)).toBe(IMPRESSION)
  })

  it('keeps the latest impression when a product is reached twice', async () => {
    const { take } = useRecommendationAttribution()

    await follow(42, IMPRESSION)
    await follow(42, OTHER)

    expect(await take(42)).toBe(OTHER)
  })

  it('forgets an entry older than an hour', async () => {
    const { take } = useRecommendationAttribution()

    await follow(42, IMPRESSION)
    vi.setSystemTime(new Date('2026-09-11T10:59:59Z'))
    await follow(43, OTHER)
    vi.setSystemTime(new Date('2026-09-11T11:00:01Z'))

    expect(await take(42)).toBeUndefined()
    expect(await take(43)).toBe(OTHER)
  })

  it('survives a tab reload through sessionStorage', async () => {
    await follow(42, IMPRESSION)

    // A fresh composable instance reads what the previous one wrote.
    expect(await useRecommendationAttribution().take(42)).toBe(IMPRESSION)
  })

  it('clears the key once nothing is left to carry', async () => {
    const { take } = useRecommendationAttribution()

    await follow(42, IMPRESSION)
    await take(42)

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('treats corrupt storage as empty instead of throwing', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{not json')
    const { take } = useRecommendationAttribution()

    expect(await take(42)).toBeUndefined()
    await follow(42, IMPRESSION)
    expect(await take(42)).toBe(IMPRESSION)
  })

  it('degrades to nothing when storage is unavailable', async () => {
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
      const { take } = useRecommendationAttribution()

      await expect(follow(42, IMPRESSION)).resolves.toBeUndefined()
      expect(await take(42)).toBeUndefined()
    }
    finally {
      if (original) Object.defineProperty(window, 'sessionStorage', original)
      else Reflect.deleteProperty(window, 'sessionStorage')
    }
  })

  it('waits for a showing still being reported, and leaves nothing behind', async () => {
    const { remember, take } = useRecommendationAttribution()
    let answer: (impressionId: string) => void = () => {}
    remember(42, new Promise((resolve) => {
      answer = resolve
    }))

    const taken = take(42)
    answer(IMPRESSION)

    expect(await taken).toBe(IMPRESSION)
    await flushPromises()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('does not hold an add-to-cart for a showing that is not answered', async () => {
    const { remember, take } = useRecommendationAttribution()
    remember(42, new Promise(() => {}))

    const taken = take(42)
    await vi.advanceTimersByTimeAsync(1000)

    expect(await taken).toBeUndefined()
  })
})
