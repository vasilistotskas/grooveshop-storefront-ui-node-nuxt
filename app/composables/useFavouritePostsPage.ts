/**
 * The blog posts the shopper liked, a page at a time, apart from their
 * drawing (`Storefront/Account/FavouritePosts` and the tenants' own). The
 * page is the route's `?page=`; `ordering` is Django's (`-createdAt`, the
 * latest like first) and a drawing that lets the shopper sort passes a
 * getter, and the list reloads as it changes. Call it where `await` is
 * allowed: the list is read before it returns.
 */
export async function useFavouritePostsPage(options: {
  pageSize: number
  ordering?: MaybeRefOrGetter<string>
}) {
  const route = useRoute()
  const { user } = useUserSession()

  const page = computed(() => Math.max(1, Number(route.query.page) || 1))

  const { data: posts, status, error, refresh } = await useApi(`/api/user/account/${user.value?.id}/liked-blog-posts`, {
    key: `favourite-posts-${user.value?.id}`,
    method: 'GET',
    query: { page, pageSize: options.pageSize, ordering: computed(() => toValue(options.ordering) ?? '-createdAt') },
  })

  return { posts, status, error, refresh, page }
}
