export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const siteConfig = getSiteConfig(event)
    // Prefer the tenant's primary domain for product links — falls back to
    // the build-time NUXT_PUBLIC_BASE_URL when tenant context is missing
    // (e.g. during prerender). Mirrors server/routes/rss.xml.get.ts.
    const host = getRequestHost(event, { xForwardedHost: false })
    const tenantDomain = event.context.tenant?.primaryDomain || host
    const baseUrl = tenantDomain ? `https://${tenantDomain}` : config.public.baseUrl

    const feedString = await generateProductFeed(
      host,
      'meta',
      siteConfig.url,
      siteConfig.name,
      siteConfig.description,
      baseUrl,
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
