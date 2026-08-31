/**
 * Client-side wholesale-price hydration.
 *
 * Catalogue HTML and the product API responses are aggressively cached
 * and deliberately anonymous (the anonymous-render contract in
 * app/plugins/setup.ts), so a B2B price must NEVER be server-rendered
 * into them. Instead, product surfaces register the ids they display
 * and this composable batch-fetches the caller's wholesale prices from
 * the uncached, auth-forwarded /api/b2b/prices proxy after hydration —
 * retail shows first, then swaps (accepted trade-off).
 *
 * Lifecycle contract (the part the first review round found broken):
 *  - Registrations are BUFFERED while inactive. On the SWR-cached
 *    pages the session is restored asynchronously AFTER onMounted
 *    (nuxt-auth-utils app:suspense:resolve), so dropping early
 *    registrations would leave the feature dead on exactly the pages
 *    it targets — the `active` watcher replays the buffer instead.
 *  - Prices and the fetched-set are per-IDENTITY: the
 *    b2b-pricing.client.ts plugin resets them on every login/logout/
 *    user switch, so a shared device can never show the previous
 *    customer's tier (and a new login re-fetches for already-mounted
 *    surfaces).
 *  - Only 404/403 (feature dark / caller not in the program) halt for
 *    the session. A 401 is a transient session race — the ids stay
 *    wanted and re-fetch on the next auth transition.
 */

const FLUSH_DELAY_MS = 50

// Client-only singleton timer — SSR never schedules (register guards
// on import.meta.server), so module state is safe here.
let flushTimer: ReturnType<typeof setTimeout> | null = null

function pricesState() {
  return useState<Record<number, B2bPrice>>('b2b-prices', () => ({}))
}
function fetchedState() {
  return useState<Record<number, boolean>>('b2b-prices-fetched', () => ({}))
}
function haltedState() {
  return useState<boolean>('b2b-prices-halted', () => false)
}
function wantedState() {
  // Survives identity resets on purpose: it is WHAT the mounted
  // surfaces display, not WHO is looking.
  return useState<Record<number, boolean>>('b2b-prices-wanted', () => ({}))
}

/** Reset the per-identity state (called by b2b-pricing.client.ts on
 * every auth transition). `wanted` is kept — the next activation
 * re-fetches it under the new identity. */
export function resetB2BPricing(): void {
  pricesState().value = {}
  fetchedState().value = {}
  haltedState().value = false
}

export function useB2BPricing() {
  const { loggedIn } = useUserSession()
  const tenantStore = useTenantStore()

  const prices = pricesState()
  const wanted = wantedState()
  const fetched = fetchedState()
  const halted = haltedState()

  const active = computed(
    () => loggedIn.value && tenantStore.b2bEnabled && !halted.value,
  )

  async function flush(): Promise<void> {
    flushTimer = null
    if (!active.value) {
      return
    }
    const ids = Object.keys(wanted.value)
      .map(Number)
      .filter(id => !fetched.value[id])
    if (ids.length === 0) {
      return
    }
    for (const id of ids) {
      fetched.value[id] = true
    }
    try {
      const rows = await $fetch('/api/b2b/prices', {
        query: { ids: ids.join(',') },
      })
      for (const row of rows ?? []) {
        prices.value[row.productId] = row
      }
    }
    catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 403) {
        // Feature dark or caller outside the program — stop asking
        // for the rest of the session.
        halted.value = true
      }
      // Transient failures (401 session race, network): un-mark so the
      // next registration or auth transition retries — never hot-loop.
      for (const id of ids) {
        fetched.value[id] = false
      }
      log.warn({ tag: 'b2b-pricing', message: 'price hydration failed' })
    }
  }

  function scheduleFlush(): void {
    if (import.meta.server || flushTimer) {
      return
    }
    flushTimer = setTimeout(() => {
      void flush()
    }, FLUSH_DELAY_MS)
  }

  function register(productIds: number | number[]): void {
    if (import.meta.server) {
      return
    }
    const list = Array.isArray(productIds) ? productIds : [productIds]
    for (const id of list) {
      if (id && !wanted.value[id]) {
        wanted.value[id] = true
      }
    }
    if (active.value) {
      scheduleFlush()
    }
  }

  // Late activation (session restored after mount on cached pages, or
  // a login without navigation): replay everything the mounted
  // surfaces already asked for.
  watch(active, (value) => {
    if (value) {
      scheduleFlush()
    }
  })

  function priceFor(productId: number | undefined): B2bPrice | undefined {
    // The active guard is defense in depth for the logout window
    // before the identity plugin's reset lands.
    if (!productId || !active.value) {
      return undefined
    }
    return prices.value[productId]
  }

  return {
    active,
    register,
    priceFor,
  }
}
