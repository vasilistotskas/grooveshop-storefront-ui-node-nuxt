/**
 * The rail's items live in `useState` (shared by every caller in the
 * app) AND in localStorage (shared with other tabs and reloads). Writes
 * merge against storage, not memory, so a stale lazily-hydrated copy
 * can never wipe newer history.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RecentlyViewedProduct } from '~/composables/useRecentlyViewed'

const KEY = 'grooveshop:recently-viewed'
const NOW = new Date('2026-09-30T10:00:00Z').getTime()

const product = (id: number): RecentlyViewedProduct => ({ id, name: `P${id}`, addedAt: 0 })
const store = (items: RecentlyViewedProduct[]) => window.localStorage.setItem(KEY, JSON.stringify(items))
const stored = () => JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as RecentlyViewedProduct[] | null
const ids = (items: readonly RecentlyViewedProduct[]) => items.map(p => p.id)

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearNuxtState('recently-viewed:items')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the stored history, at most five items', () => {
    store([1, 2, 3, 4, 5, 6].map(product))

    expect(ids(useRecentlyViewed().items.value)).toEqual([1, 2, 3, 4, 5])
  })

  it('puts a viewed product first, stamped with the view time, and persists it', () => {
    store([product(1)])
    const { items, add } = useRecentlyViewed()

    add(product(2))

    expect(ids(items.value)).toEqual([2, 1])
    expect(items.value[0]!.addedAt).toBe(NOW)
    expect(ids(stored()!)).toEqual([2, 1])
  })

  it('moves a product viewed again to the front instead of listing it twice', () => {
    store([1, 2, 3].map(product))
    const { items, add } = useRecentlyViewed()

    add(product(3))

    expect(ids(items.value)).toEqual([3, 1, 2])
  })

  it('drops the oldest product beyond five', () => {
    store([1, 2, 3, 4, 5].map(product))
    const { items, add } = useRecentlyViewed()

    add(product(6))

    expect(ids(items.value)).toEqual([6, 1, 2, 3, 4])
  })

  it('merges a view into what storage holds now, not into a stale in-memory copy', () => {
    const { items, add } = useRecentlyViewed()
    expect(items.value).toEqual([])
    // Another tab (or an earlier, lazily-hydrated component) wrote since.
    store([product(1)])

    add(product(2))

    expect(ids(stored()!)).toEqual([2, 1])
  })

  it('removes one product from the list and from storage', () => {
    store([1, 2, 3].map(product))
    const { items, remove } = useRecentlyViewed()

    remove(2)

    expect(ids(items.value)).toEqual([1, 3])
    expect(ids(stored()!)).toEqual([1, 3])
  })

  it('empties the list and the stored copy on clear', () => {
    store([1, 2].map(product))
    const { items, clear } = useRecentlyViewed()

    clear()

    expect(items.value).toEqual([])
    expect(stored()).toEqual([])
  })

  it('excludes the product being viewed from the rail, and nothing when there is none', () => {
    store([1, 2, 3].map(product))
    const { itemsExcluding } = useRecentlyViewed()

    expect(ids(itemsExcluding(2).value)).toEqual([1, 3])
    expect(ids(itemsExcluding(null).value)).toEqual([1, 2, 3])
  })

  it.each([
    ['corrupt JSON', '{not json'],
    ['a non-array value', '{"id":1}'],
  ])('treats %s in storage as an empty history', (_case, raw) => {
    window.localStorage.setItem(KEY, raw)

    expect(useRecentlyViewed().items.value).toEqual([])
  })

  it('shares one list between every caller in the app', () => {
    const first = useRecentlyViewed()
    const second = useRecentlyViewed()

    first.add(product(7))

    expect(ids(second.items.value)).toEqual([7])
  })
})
