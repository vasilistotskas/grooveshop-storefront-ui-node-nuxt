/**
 * The order the account's order page shows (`/account/orders/<id>`), apart
 * from its drawing (`Storefront/Account/OrderDetail` and the tenants' own):
 * the route's order id, and the order as Django holds it, in the page's
 * language. `refresh` reads it again after a change (a cancellation, a
 * payment refused); a read that fails leaves the order as it was.
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
  // Watched before the first await, so the watcher belongs to the page.
  const order = shallowRef<OrderDetail>()
  watch(request.data, (value) => {
    if (value) order.value = value
  }, { immediate: true })

  const { refresh } = await request

  return { orderId, order, refresh }
}
