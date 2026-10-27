/**
 * The shopper's likes among the blog posts on screen, loaded into the
 * user store so each post's like button shows its state.
 *
 * `useLikedBlogPosts` is for a list: it asks once the signed-in shopper has
 * posts on screen, and again when the posts change. `useLikedBlogPost` is
 * for one post's page. Both are client-only: the answer is the visitor's
 * own, and the cached, anonymous HTML never carries it.
 *
 * Shared by every drawing of the blog (`Blog/Posts/List.vue`,
 * `Storefront/BlogPost.vue` and the tenants' own). Call them from a
 * `<script setup>`.
 */
export function useLikedBlogPosts(postIds: MaybeRefOrGetter<number[]>) {
  const { loggedIn, user } = useUserSession()
  const { updateLikedPosts } = useUserStore()
  const ids = computed(() => toValue(postIds))
  const shouldFetch = computed(() => loggedIn.value && ids.value.length > 0)

  // `watch: false` is required — the reactive `postIds` body would
  // otherwise auto-refetch on every pagination change even for
  // anonymous visitors (`immediate` only gates the first call),
  // spamming the auth-required endpoint with 401s.
  const { data, execute } = useApi('/api/blog/posts/liked-posts', {
    key: `likedBlogPosts${user.value?.id}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: { postIds: ids },
    immediate: false,
    server: false, // Client-side only - user-specific data
    watch: false,
  })

  watch(data, (liked) => {
    if (liked) updateLikedPosts(liked.postIds)
  })

  watch(
    ids,
    () => {
      if (shouldFetch.value) {
        execute()
      }
    },
    { immediate: import.meta.client },
  )
}

export async function useLikedBlogPost(blogPostId: MaybeRefOrGetter<number | null>) {
  const { loggedIn } = useUserSession()
  const { updateLikedPosts } = useUserStore()
  const id = toValue(blogPostId)

  // Non-critical data: defer to client-side (doesn't block FCP/LCP)
  const request = useApi('/api/blog/posts/liked-posts', {
    key: `likedPosts${id}`,
    method: 'POST',
    body: {
      postIds: [id],
    },
    enabled: loggedIn,
    server: false, // Client-side only - not needed for initial render
  })

  // `likedPostsData` resolves client-side only (server: false), so it is null
  // during setup on a hard load — apply the liked state reactively when it
  // arrives instead of reading it once synchronously.
  watch(request.data, (value) => {
    if (value) {
      updateLikedPosts(value.postIds)
    }
  }, { immediate: true })

  await request
}
