const SITEMAP_CACHE_AGE = 60 * 60

// Hoisted to module scope so ``defineCachedFunction`` registers each
// fetcher exactly once — calling ``createCachedFetcher`` inside the
// handler meant every sitemap request re-registered the same name
// into Nitro's cache registry (harmless, but wasteful + fragile).
// Callers pass the request host and locale for per-tenant,
// per-language cache scoping.
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
// Published ContentPages — the merchant's own policy pages. These were
// the one indexable surface the sitemap never listed: static routes come
// from the build-time route manifest and dynamic ones from the fetchers
// above, and `/info/<slug>` is neither, so a merchant could publish a
// returns policy and Google would never be told it exists.
const cachedContentPages = createCachedFetcher<ContentPage>(
  'sitemap:content-pages',
  SITEMAP_CACHE_AGE,
)

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const host = getRequestHost(event, { xForwardedHost: false })
  const locale = requestLocale(event)

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
  // The catalogue is a merchant SETTING, not a plan flag: a store can
  // hold a product model and serve no shop (an engineering contractor
  // quoting per project). Its listings and product pages 404 under
  // `app/middleware/catalogue-enabled.ts`, so they must not be
  // advertised here either.
  const catalogueEnabled = await settingEnabledForHost(
    host,
    apiBaseUrl,
    'CATALOGUE_ENABLED',
  )

  // Fetch all data in parallel for better performance — tenant host
  // is passed so each tenant's sitemap has its own cache entry.
  // languageCode ensures Django returns translations for the active locale.
  // Blog data is skipped entirely when blogEnabled is false so disabled
  // tenants don't leak blog URL surface in the sitemap.
  const [
    allPosts,
    allBlogCategories,
    allProducts,
    allProductCategories,
    allContentPages,
  ] = await Promise.all([
    blogEnabled
      ? cachedBlogPosts(host, locale, `${apiBaseUrl}/blog/post?languageCode=${ACTIVE_LOCALE}`)
      : Promise.resolve([]),
    blogEnabled
      ? cachedBlogCategories(host, locale, `${apiBaseUrl}/blog/category?languageCode=${ACTIVE_LOCALE}`)
      : Promise.resolve([]),
    catalogueEnabled
      ? cachedProducts(host, locale, `${apiBaseUrl}/product?languageCode=${ACTIVE_LOCALE}`)
      : Promise.resolve([]),
    catalogueEnabled
      ? cachedProductCategories(host, locale, `${apiBaseUrl}/product/category?languageCode=${ACTIVE_LOCALE}`)
      : Promise.resolve([]),
    // Ungated: a content page is published or it is not, and the API
    // returns only published rows to an anonymous caller. pageSize is
    // explicit because the endpoint's default page is 12 — a store with
    // more policy pages than that would have silently listed a subset.
    cachedContentPages(
      host,
      locale,
      `${apiBaseUrl}/content-page?languageCode=${ACTIVE_LOCALE}&pageSize=100`,
    ),
  ])

  return [
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
    // Content pages, minus the ones a dedicated legal route already
    // serves. `/info/terms` and `/terms-of-use` render the same
    // document, and `/info/[slug]` 301s to the canonical route — so
    // listing both would put a redirect in the sitemap and advertise two
    // addresses for one page. Same map the redirect and the footer read.
    //
    // The canonical legal routes are NOT emitted here. They come from
    // static route discovery and are gated per tenant in
    // `server/plugins/sitemap-tenant-gate.ts`, which drops the ones
    // whose ContentPage that tenant has not published. Emitting them
    // here as well would hand the module two entries for one `loc`.
    ...allContentPages
      .filter(page => !LEGAL_ROUTE_BY_SLUG.has(page.slug))
      .map(page => asSitemapUrl({
        loc: baseUrl + '/info/' + page.slug,
        changefreq: 'monthly',
        priority: 0.4,
        lastmod: new Date(page.updatedAt),
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
