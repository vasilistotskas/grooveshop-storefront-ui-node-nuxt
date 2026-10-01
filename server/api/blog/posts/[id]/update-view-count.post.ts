export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const params = await getValidatedRouterParams(
    event,
    zIncrementBlogPostViewsPath.parse,
  )

  // Per-session deduplication: skip the upstream call if this session has
  // already incremented the view count for this post.
  const session = await getUserSession(event)
  const viewedPosts = session.viewedPosts ?? []
  const postId = String(params.id)

  if (viewedPosts.includes(postId)) {
    // Already viewed in this session — return a no-op success response
    // without hitting Django again.
    return null
  }

  // Record in session (fire-and-forget; view dedup is best-effort)
  replaceUserSession(event, {
    ...session,
    viewedPosts: [...viewedPosts, postId],
  }).catch(() => {})

  try {
    // useBackendFetch relays the visitor's identity: Django throttles
    // view counting per visitor, and a bare $fetch reaches it as this
    // pod, putting every anonymous reader in one shared bucket.
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/blog/post/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, zIncrementBlogPostViewsResponse)
  }
  catch (error) {
    handleError(error)
  }
})
