/**
 * Remembers which suggestion-strip impression a product was reached
 * from, so the add-to-cart that follows can carry it to the backend
 * (``CartItem.recommendation_impression_id`` → the order line → an exact
 * ``attach``). This is the one attribution path that needs no cart and
 * no customer identity at the time the strip was shown — a guest on a
 * first visit has neither — and it rides the shopper's own action, so
 * it is not a tracking identifier and needs no consent gate.
 *
 * Per-tab ``sessionStorage``, first-party, never sent anywhere but our
 * own add-to-cart call; entries expire after an hour so a stale click
 * from a previous browsing session cannot claim a later purchase.
 * SSR-safe: every call is a no-op on the server.
 */

const STORAGE_KEY = 'recommendation-attribution'
const TTL_MS = 60 * 60 * 1000
/** How long an add-to-cart waits for the id of a showing still being reported. */
const PENDING_WAIT_MS = 1000

/** Products followed from a strip whose impression is not answered yet. */
const pending = new Map<number, Promise<string | undefined>>()

type Entry = { impressionId: string, at: number }
type Entries = Record<string, Entry>

function read(): Entries {
  if (!import.meta.client) return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Entries
    const now = Date.now()
    const live: Entries = {}
    for (const [productId, entry] of Object.entries(parsed)) {
      if (entry && typeof entry.impressionId === 'string' && now - entry.at < TTL_MS) {
        live[productId] = entry
      }
    }
    return live
  }
  catch {
    return {}
  }
}

function write(entries: Entries): void {
  if (!import.meta.client) return
  try {
    if (Object.keys(entries).length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
    else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    }
  }
  catch {
    // Storage blocked (private mode, quota): attribution degrades to
    // the cart/customer windows; the add-to-cart itself is unaffected.
  }
}

export function useRecommendationAttribution() {
  const store = (productId: number, impressionId: string): void => {
    const entries = read()
    entries[String(productId)] = { impressionId, at: Date.now() }
    write(entries)
  }

  /**
   * The shopper followed a strip tile for ``productId``. ``showing`` is the
   * id its impression is recorded under, still on its way when the tile is
   * followed within the impression's round trip: kept at once, so the
   * add-to-cart of the same click finds it.
   */
  const remember = (productId: number, showing: Promise<string | undefined>): void => {
    if (!import.meta.client) return
    pending.set(productId, showing)
    showing.then((impressionId) => {
      // Taken meanwhile, or followed again from another strip.
      if (pending.get(productId) !== showing) return
      pending.delete(productId)
      if (impressionId) store(productId, impressionId)
    })
  }

  /** The impression to carry on an add-to-cart of ``productId``, consumed. */
  const take = async (productId: number): Promise<string | undefined> => {
    if (!import.meta.client) return undefined
    const { [String(productId)]: entry, ...rest } = read()
    // Always write back: ``read`` already dropped expired entries.
    write(rest)
    const showing = pending.get(productId)
    if (!showing) return entry?.impressionId
    pending.delete(productId)
    return Promise.race([
      showing,
      new Promise<undefined>(resolve => setTimeout(resolve, PENDING_WAIT_MS)),
    ])
  }

  return { remember, take }
}
