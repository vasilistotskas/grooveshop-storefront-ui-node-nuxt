export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const siteConfig = getSiteConfig(event)

    const feedString = await generateProductFeed(
      'meta',
      siteConfig.url,
      siteConfig.name,
      siteConfig.description,
      config.public.baseUrl,
      config.apiBaseUrl,
      config.mediaStreamPath,
    )

    setHeaders(event, {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 'max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex, nofollow',
    })

    return feedString
  }
  catch (error) {
    log.error({ action: 'feeds:meta', error })
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate product feed' })
  }
})
