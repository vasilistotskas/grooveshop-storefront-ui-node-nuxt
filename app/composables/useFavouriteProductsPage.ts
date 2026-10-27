/**
 * The products the shopper saved, a page at a time, apart from their
 * drawing (`Storefront/Account/FavouriteProducts` and the tenants' own).
 * The page is the route's `?page=`; `ordering` is Django's
 * (`-createdAt`, newest first) and a drawing that lets the shopper sort
 * passes a getter, and the list reloads as it changes.
 *
 * Each product on the list is a favourite by definition, so the hearts are
 * primed from the list itself (`updateFavouriteProducts`), on the server as
 * well as in the browser: the first client render matches the server's.
 * `onRemoved` reloads the list and the favourites tabs' count after a heart
 * was switched off. Call it where `await` is allowed: the list is read
 * before it returns.
 */
export async function useFavouriteProductsPage(options: {
  pageSize: number
  ordering?: MaybeRefOrGetter<string>
}) {
  const route = useRoute()
  const { user } = useUserSession()
  const { updateFavouriteProducts } = useUserStore()

  const page = computed(() => Math.max(1, Number(route.query.page) || 1))

  const { data: favourites, status, error, refresh } = await useApi<GetUserAccountFavouriteProductsResponse>(`/api/user/account/${user.value?.id}/favourite-products`, {
    key: `favourite-products-${user.value?.id}`,
    method: 'GET',
    query: { page, pageSize: options.pageSize, ordering: computed(() => toValue(options.ordering) ?? '-createdAt') },
  })

  async function onRemoved() {
    await Promise.all([refresh(), refreshNuxtData(favouriteCountKey('products', user.value?.id))])
  }

  watch(favourites, (value) => {
    updateFavouriteProducts((value?.results ?? []).map(favourite => ({
      id: favourite.id,
      userId: favourite.userId,
      productId: favourite.product.id,
      createdAt: favourite.createdAt,
    })))
  }, { immediate: true })

  return { favourites, status, error, refresh, page, onRemoved }
}
