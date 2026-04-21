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
const MAX_ITEMS = 5

/**
 * Read the persisted history off localStorage. Always safe to call;
 * returns an empty list on SSR or any parse/access error.
 */
function readFromStorage(): RecentlyViewedProduct[] {
  if (!import.meta.client) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as RecentlyViewedProduct[]).slice(0, MAX_ITEMS)
  }
  catch (error) {
    log.warn('recently-viewed', 'read failed', { error })
    return []
  }
}

function writeToStorage(next: RecentlyViewedProduct[]) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  catch (error) {
    log.warn('recently-viewed', 'write failed', { error })
  }
}

/**
 * Tracks and exposes the user's recently-viewed products, persisted to
 * localStorage.
 *
 * Implementation: we intentionally re-read localStorage every time the
 * composable is invoked on the client instead of trusting an in-memory
 * cache. That's cheap (localStorage is a sync call) and sidesteps a
 * whole class of "stale cache clobbered storage" bugs that hit us with
 * VueUse's ``useLocalStorage`` + ``hydrate-on-visible`` interaction.
 * Writes only happen in response to explicit ``add``/``remove``/``clear``
 * calls, so a fresh reload is always idempotent.
 */
export function useRecentlyViewed() {
  const items = useState<RecentlyViewedProduct[]>(
    'recently-viewed:items',
    () => readFromStorage(),
  )

  // The very first client-side invocation may have received the SSR
  // payload's empty default instead of the factory result. Refresh
  // from localStorage once we know we're on the client — subsequent
  // calls keep whatever's in memory (respecting in-flight mutations).
  if (import.meta.client && items.value.length === 0) {
    const stored = readFromStorage()
    if (stored.length) items.value = stored
  }

  const add = (product: RecentlyViewedProduct) => {
    if (!import.meta.client) return
    // Merge against the freshest stored copy so a stale in-memory ref
    // (e.g. from a lazy-hydrated component) can't wipe newer history.
    const baseline = readFromStorage()
    const next = [
      { ...product, addedAt: Date.now() },
      ...baseline.filter(p => p.id !== product.id),
    ].slice(0, MAX_ITEMS)
    items.value = next
    writeToStorage(next)
  }

  const remove = (productId: number) => {
    if (!import.meta.client) return
    const next = readFromStorage().filter(p => p.id !== productId)
    items.value = next
    writeToStorage(next)
  }

  const clear = () => {
    if (!import.meta.client) return
    items.value = []
    writeToStorage([])
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
