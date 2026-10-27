/**
 * The order the account's order page shows (`/account/orders/<id>`), apart
 * from its drawing (`Storefront/Account/OrderDetail` and the tenants' own):
 * the route's order id, and the order as Django holds it, in the page's
 * language. `refresh` reads it again after a change (a cancellation).
 * Call it where `await` is allowed: the order is read before it returns.
 */
export async function useOrderDetail() {
  const route = useRoute()
  const { locale } = useNuxtApp().$i18n
  const orderId = 'id' in route.params ? route.params.id : undefined

  const { data: order, refresh } = await useApi<OrderDetail>(`/api/orders/${orderId}`, {
    key: `order${orderId}`,
    method: 'GET',
    query: { languageCode: locale },
  })

  return { orderId, order, refresh }
}
