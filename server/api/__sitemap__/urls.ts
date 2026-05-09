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

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Use the tenant's primary domain for public URLs so the sitemap reflects
  // the requesting tenant (not the single NUXT_PUBLIC_BASE_URL build-time value).
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = event.context.tenant?.primaryDomain || host
  const baseUrl = tenantDomain ? `https://${tenantDomain}` : config.public.baseUrl
  const apiBaseUrl = config.apiBaseUrl

  // Only 'el' is active per i18n config. When more locales activate,
  // iterate SUPPORTED_LOCALES here and emit hreflang alternates per entry.
  const ACTIVE_LOCALE = 'el'

  // Fetch all data in parallel for better performance — tenant host
  // is passed so each tenant's sitemap has its own cache entry.
  // languageCode ensures Django returns translations for the active locale.
  const [allPosts, allBlogCategories, allProducts, allProductCategories] = await Promise.all([
    cachedBlogPosts(host, `${apiBaseUrl}/blog/post?languageCode=${ACTIVE_LOCALE}`),
    cachedBlogCategories(host, `${apiBaseUrl}/blog/category?languageCode=${ACTIVE_LOCALE}`),
    cachedProducts(host, `${apiBaseUrl}/product?languageCode=${ACTIVE_LOCALE}`),
    cachedProductCategories(host, `${apiBaseUrl}/product/category?languageCode=${ACTIVE_LOCALE}`),
  ])

  return [
    // Blog categories
    ...allBlogCategories.map(category => asSitemapUrl({
      loc: baseUrl + '/blog/category/' + category.id + '/' + category.slug,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(category.updatedAt),
    })),
    // Blog posts
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
            loc: `${config.public.mediaStreamPath}/${product.mainImagePath}`,
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
