/** The data key of one favourites count — for a page that changes the list to refresh it. */
export function favouriteCountKey(kind: 'products' | 'posts', userId: number | undefined) {
  return `favourite-${kind}-count-${userId}`
}

/**
 * How many products and posts the shopper has saved — the counts on the
 * favourites tabs. One row of each list is enough: the paginated
 * envelope carries the total.
 */
export async function useFavouriteCounts() {
  const { user } = useUserSession()
  const userId = user.value?.id
  // Saved posts exist only with the blog; without it Django answers 404.
  const blogEnabled = useStoreFeature('blog')

  const [{ data: products }, { data: posts }] = await Promise.all([
    useApi(`/api/user/account/${userId}/favourite-products`, {
      key: favouriteCountKey('products', userId),
      method: 'GET',
      query: { pageSize: 1 },
    }),
    useApi(`/api/user/account/${userId}/liked-blog-posts`, {
      key: favouriteCountKey('posts', userId),
      method: 'GET',
      query: { pageSize: 1 },
      enabled: blogEnabled,
    }),
  ])

  return {
    products: computed(() => products.value?.count ?? 0),
    posts: computed(() => posts.value?.count ?? 0),
  }
}
