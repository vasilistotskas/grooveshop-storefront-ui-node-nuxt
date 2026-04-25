const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 10

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Per-IP rate limiting: 10 requests / 60 s / IP.
  // Uses the Nitro cache storage (Redis in production, memory in dev).
  const clientIp
    = getRequestHeader(event, 'cf-connecting-ip')
      || getRequestHeader(event, 'true-client-ip')
      || getRequestIP(event, { xForwardedFor: true })
      || 'unknown'

  const params = await getValidatedRouterParams(
    event,
    zIncrementBlogPostViewsPath.parse,
  )

  const rateLimitKey = `rate:view-count:${clientIp}`
  const storage = useStorage('cache')

  const current = await storage.getItem<number>(rateLimitKey)
  const count = (current ?? 0) + 1

  if (count > RATE_LIMIT_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  }

  // Set with TTL only on first hit to start the window; subsequent hits
  // just increment the counter (TTL remains from the first set).
  if (count === 1) {
    await storage.setItem(rateLimitKey, count, { ttl: RATE_LIMIT_WINDOW_SECONDS })
  }
  else {
    await storage.setItem(rateLimitKey, count)
  }

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
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/post/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, zIncrementBlogPostViewsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
