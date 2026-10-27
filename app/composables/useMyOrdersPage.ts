/**
 * The shopper's orders, a page at a time, apart from their drawing
 * (`Storefront/Account/Orders` and the tenants' own). The page is the
 * route's `?page=`; `ordering` is a getter for what the drawing lets the
 * shopper sort by (Django's `ordering`), and the list reloads as either
 * changes. Call it where `await` is allowed: the list is read before it
 * returns.
 */
export async function useMyOrdersPage(options: {
  pageSize: number
  ordering: MaybeRefOrGetter<string>
}) {
  const route = useRoute()

  const page = computed(() => Math.max(1, Number(route.query.page) || 1))

  const { data: orders, status, error, refresh } = await useApi<ListMyOrdersResponse>('/api/orders/my-orders', {
    key: 'account-orders',
    method: 'GET',
    query: { page, pageSize: options.pageSize, ordering: computed(() => toValue(options.ordering)) },
  })

  return { orders, status, error, refresh, page }
}
