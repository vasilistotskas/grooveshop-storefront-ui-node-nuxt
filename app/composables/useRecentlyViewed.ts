import { useLocalStorage } from '@vueuse/core'

/**
 * Shape stored in localStorage for each recently-viewed product.
 *
 * Kept intentionally small — just the fields the recently-viewed rail
 * needs to render without a fresh API call. The id is the authoritative
 * lookup; slug/image/price are cached so the rail renders instantly and
 * before any `$fetch` lands. Stale prices are acceptable here because
 * the PDP re-fetches authoritative data on click.
 */
export interface RecentlyViewedProduct {
  id: number
  slug?: string | null
  /**
   * Translated product name resolved at view time. We store this flat
   * instead of the full translations map so list rendering is locale-
   * agnostic — if the user switches locale after viewing, the cached
   * label stays in the original locale until the next visit (good
   * enough for a recency rail; revisits re-cache).
   */
  name: string
  mainImagePath?: string | null
  finalPrice?: number | null
  /** Epoch ms of the view — used for recency sorting. */
  addedAt: number
}

const STORAGE_KEY = 'grooveshop:recently-viewed'
const MAX_ITEMS = 8

/**
 * Tracks and exposes the user's recently-viewed products, persisted to
 * localStorage. The list is bounded (`MAX_ITEMS`) and deduped by id so
 * revisiting a product just promotes its entry to the front instead of
 * inflating the list.
 */
export function useRecentlyViewed() {
  const items = useLocalStorage<RecentlyViewedProduct[]>(STORAGE_KEY, [], {
    mergeDefaults: true,
    // localStorage is only available on the client; the SSR fallback is
    // an empty array so server-rendered HTML never ships personalised
    // history (which would be a privacy + CLS pitfall).
    writeDefaults: false,
  })

  const add = (product: RecentlyViewedProduct) => {
    if (!import.meta.client) return
    const next = [
      { ...product, addedAt: Date.now() },
      ...items.value.filter(p => p.id !== product.id),
    ]
    items.value = next.slice(0, MAX_ITEMS)
  }

  const remove = (productId: number) => {
    if (!import.meta.client) return
    items.value = items.value.filter(p => p.id !== productId)
  }

  const clear = () => {
    if (!import.meta.client) return
    items.value = []
  }

  /**
   * Ordered list excluding the current product (if any). Most common
   * use-case: render on a PDP without showing the product itself.
   */
  const itemsExcluding = (productId?: number | null) => computed(() => {
    if (productId == null) return items.value
    return items.value.filter(p => p.id !== productId)
  })

  return {
    items,
    add,
    remove,
    clear,
    itemsExcluding,
  }
}
