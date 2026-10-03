/**
 * How many products and posts the shopper has saved — the counts on the
 * favourites tabs. One row of each list is enough: the paginated
 * envelope carries the total.
 */
export async function useFavouriteCounts() {
  const { user } = useUserSession()
  const userId = user.value?.id

  const [{ data: products }, { data: posts }] = await Promise.all([
    useApi(`/api/user/account/${userId}/favourite-products`, {
      key: `favourite-products-count-${userId}`,
      method: 'GET',
      query: { pageSize: 1 },
    }),
    useApi(`/api/user/account/${userId}/liked-blog-posts`, {
      key: `favourite-posts-count-${userId}`,
      method: 'GET',
      query: { pageSize: 1 },
    }),
  ])

  return {
    products: computed(() => products.value?.count ?? 0),
    posts: computed(() => posts.value?.count ?? 0),
  }
}
