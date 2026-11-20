/**
 * The order the account's order page shows (`/account/orders/<id>`), apart
 * from its drawing (`Storefront/Account/OrderDetail` and the tenants' own):
 * the route's order id, and the order as Django holds it, in the page's
 * language. `refresh` reads it again after a change (a cancellation, a
 * payment refused); a read that fails leaves the order as it was, and
 * `stale` says so.
 * Call it where `await` is allowed: the order is read before it returns.
 */
export async function useOrderDetail() {
  const route = useRoute()
  const { locale } = useNuxtApp().$i18n
  const orderId = 'id' in route.params ? route.params.id : undefined

  const request = useApi<OrderDetail>(`/api/orders/${orderId}`, {
    key: `order${orderId}`,
    method: 'GET',
    query: { languageCode: locale },
  })

  // The last order Django gave: `useApi` empties its data when a read
  // fails, which took the whole page down after a refresh that failed.
  // Registered before the first await, so it belongs to the page, and
  // `sync`: on the server Vue stops any other immediate watcher right
  // after its first run, before the read below fills the data, and the
  // page would render without its order.
  const order = shallowRef<OrderDetail>()
  watch(request.data, (value) => {
    if (value) order.value = value
  }, { immediate: true, flush: 'sync' })

  const { refresh, error } = await request

  /** The last read failed: the page shows the order as it was before it. */
  const stale = computed(() => Boolean(error.value && order.value))

  return { orderId, order, refresh, stale }
}
