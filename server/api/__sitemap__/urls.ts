const SITEMAP_CACHE_AGE = 60 * 60

// Hoisted to module scope so ``defineCachedFunction`` registers each
// fetcher exactly once — calling ``createCachedFetcher`` inside the
// handler meant every sitemap request re-registered the same name
// into Nitro's cache registry (harmless, but wasteful + fragile).
// Callers pass the request host as the first arg for per-tenant
// cache scoping.
const cachedBlogPosts = createCachedFetcher<BlogPost>(
  'sitemap:blog-posts',
  SITEMAP_CACHE_AGE,
)
const cachedBlogCategories = createCachedFetcher<BlogCategory>(
  'sitemap:blog-categories',
  SITEMAP_CACHE_AGE,
)
const cachedProducts = createCachedFetcher<Product>(
  'sitemap:products',
  SITEMAP_CACHE_AGE,
)
const cachedProductCategories = createCachedFetcher<ProductCategory>(
  'sitemap:product-categories',
  SITEMAP_CACHE_AGE,
)

/**
 * Read one ``extra_settings`` flag for the requesting tenant.
 *
 * Same X-Forwarded-Host discipline as ``createCachedFetcher``: without
 * it Django resolves the public schema and every tenant would inherit
 * the platform's flag value.
 */
const cachedTenantFlag = defineCachedFunction(
  async (tenantKey: string, apiBaseUrl: string, key: string) => {
    try {
      const setting = await $fetch<{ value?: string }>(
        `${apiBaseUrl}/settings/get`,
        {
          method: 'GET',
          query: { key },
          headers: tenantKey ? { 'X-Forwarded-Host': tenantKey } : undefined,
        },
      )
      return (setting?.value ?? 'false').toLowerCase() === 'true'
    }
    catch {
      // Fail CLOSED here, unlike the route middleware. A middleware that
      // fails open costs a rendered page; a sitemap that fails open
      // advertises a URL the same gate will 404 — the exact defect this
      // fixes (Ahrefs "4XX page in sitemap").
      return false
    }
  },
  {
    name: 'sitemap:tenant-flag',
    maxAge: SITEMAP_CACHE_AGE,
    getKey: (tenantKey: string, _apiBaseUrl: string, key: string) =>
      `${tenantKey}:${key}`,
  },
)

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const host = getRequestHost(event, { xForwardedHost: false })

  // This route is bypassed in server/middleware/0.tenant.ts (hit by
  // @nuxtjs/sitemap at build/SWR time without a real tenant Host), so
  // `event.context.tenant` is never populated here. Resolve it ourselves
  // when a real Host is present; any resolution failure (404/5xx/no host)
  // just falls back to platform-wide behavior below (the same behavior
  // this route already had before this fix).
  let tenant = event.context.tenant as TenantConfig | undefined
  if (!tenant && host) {
    const result = await getTenantConfig(host)
    if (result.type === 'ok') {
      tenant = result.config
    }
  }

  // Use the tenant's primary domain for public URLs so the sitemap reflects
  // the requesting tenant (not the single NUXT_PUBLIC_BASE_URL build-time value).
  const tenantDomain = tenant?.primaryDomain || host
  const baseUrl = tenantDomain ? `https://${tenantDomain}` : config.public.baseUrl
  const apiBaseUrl = config.apiBaseUrl

  // Sitemap <image:loc> URLs must point at THIS tenant's own asset host,
  // not the platform media host baked into NUXT_PUBLIC_MEDIA_STREAM_PATH —
  // the path segment is fixed, only the origin is per-tenant (assetsDomain).
  // Falls back to the platform path when there's no tenant context (the
  // build/SWR case this route is normally hit in). Mirrors the RSS feed and
  // useMediaStreamBaseUrl() resolution.
  const mediaStreamBase = tenant?.assetsDomain
    ? `https://${tenant.assetsDomain}${extractMediaStreamPath(config.public.mediaStreamPath as string | undefined)}`
    : config.public.mediaStreamPath as string

  // Only 'el' is active per i18n config. When more locales activate,
  // iterate SUPPORTED_LOCALES here and emit hreflang alternates per entry.
  const ACTIVE_LOCALE = 'el'

  const blogEnabled = tenant?.blogEnabled ?? true

  // Feature-gated STATIC routes. ``sitemap.exclude`` in nuxt.config
  // keeps them out of the module's route discovery, because that pass
  // has no tenant context and listed them for every tenant — including
  // the ones whose route middleware answers 404 (webside.gr shipped
  // /loyalty-program in its sitemap while LOYALTY_ENABLED was false).
  // They are re-added HERE, where the tenant is resolved, under exactly
  // the two-tier gate the middleware applies: plan flag AND the runtime
  // extra_settings toggle.
  const gatedRoutes = await Promise.all([
    tenant?.loyaltyEnabled
      ? cachedTenantFlag(host, apiBaseUrl, 'LOYALTY_ENABLED').then(
          on => (on ? '/loyalty-program' : null),
        )
      : Promise.resolve(null),
  ])

  // Fetch all data in parallel for better performance — tenant host
  // is passed so each tenant's sitemap has its own cache entry.
  // languageCode ensures Django returns translations for the active locale.
  // Blog data is skipped entirely when blogEnabled is false so disabled
  // tenants don't leak blog URL surface in the sitemap.
  const [allPosts, allBlogCategories, allProducts, allProductCategories] = await Promise.all([
    blogEnabled
      ? cachedBlogPosts(host, `${apiBaseUrl}/blog/post?languageCode=${ACTIVE_LOCALE}`)
      : Promise.resolve([]),
    blogEnabled
      ? cachedBlogCategories(host, `${apiBaseUrl}/blog/category?languageCode=${ACTIVE_LOCALE}`)
      : Promise.resolve([]),
    cachedProducts(host, `${apiBaseUrl}/product?languageCode=${ACTIVE_LOCALE}`),
    cachedProductCategories(host, `${apiBaseUrl}/product/category?languageCode=${ACTIVE_LOCALE}`),
  ])

  return [
    // No explicit type predicate: TS narrows `!== null` on its own, and
    // `route is string` is wider than the literal element type (TS2677).
    ...gatedRoutes.filter(route => route !== null).map(
      route => asSitemapUrl({
        loc: baseUrl + route,
        changefreq: 'monthly',
        priority: 0.4,
      }),
    ),
    // Blog categories — omitted when blog is disabled for this tenant
    ...allBlogCategories.map(category => asSitemapUrl({
      loc: baseUrl + '/blog/category/' + category.id + '/' + category.slug,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(category.updatedAt),
    })),
    // Blog posts — omitted when blog is disabled for this tenant
    ...allPosts.map(post => asSitemapUrl({
      loc: baseUrl + '/blog/post/' + post.id + '/' + post.slug,
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date(post.updatedAt),
    })),
    // Product categories (lower priority than products)
    ...allProductCategories.map(category => asSitemapUrl({
      loc: baseUrl + '/products/category/' + category.id + '/' + category.slug,
      changefreq: 'weekly',
      priority: 0.6,
      lastmod: new Date(category.updatedAt),
    })),
    // Products (highest priority for e-commerce)
    ...allProducts.map(product => asSitemapUrl({
      loc: baseUrl + '/products/' + product.id + '/' + product.slug,
      changefreq: 'daily',
      priority: 0.9,
      lastmod: new Date(product.updatedAt),
      images: product.mainImagePath
        ? [{
            loc: `${mediaStreamBase}/${product.mainImagePath}`,
            // Prefer the active locale (el) translation; fall back to any
            // available locale so the field is never silently empty.
            title: product.translations?.el?.name
              || Object.values(product.translations ?? {}).find(t => t?.name)?.name
              || undefined,
            // Short product description as the image caption. Truncated at
            // 160 chars to keep the sitemap lean.
            caption: product.translations?.el?.description
              ? product.translations.el.description.replace(/<[^>]+>/g, '').slice(0, 160) || undefined
              : undefined,
          }]
        : undefined,
    })),
  ]
})
