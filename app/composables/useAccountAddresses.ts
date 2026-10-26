/**
 * The signed-in shopper's saved addresses, a page at a time, in the order
 * the page asks for. Every drawing of the account's addresses page reads
 * them here, so they are one request under one key; the page is the
 * route's `?page=`.
 *
 * `ordering` is Django's (`-isMain,-createdAt`: the default first, the
 * order checkout offers them in). A drawing that lets the shopper sort
 * passes a getter, and the list reloads as it changes.
 *
 * Returns the request itself: a page that renders only once the list is
 * in `await`s it, one that shows its own loading state does not.
 */
export function useAccountAddresses(options: {
  pageSize: number
  ordering: MaybeRefOrGetter<string>
}) {
  const route = useRoute()
  const page = computed(() => Math.max(1, Number(route.query.page) || 1))

  return useApi('/api/user/addresses', {
    key: 'account-addresses',
    method: 'GET',
    query: {
      page,
      pageSize: options.pageSize,
      ordering: computed(() => toValue(options.ordering)),
    },
  })
}
