const SITEMAP_CACHE_AGE = 60 * 60

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl
  const apiBaseUrl = config.apiBaseUrl

  // Namespace cache names so sitemap and RSS fetchers don't collide
  // inside defineCachedFunction's global registry (shared cache keys
  // with divergent TTLs would otherwise serve stale data across routes).
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

  // Fetch all data in parallel for better performance
  const [allPosts, allBlogCategories, allProducts, allProductCategories] = await Promise.all([
    cachedBlogPosts(`${apiBaseUrl}/blog/post`),
    cachedBlogCategories(`${apiBaseUrl}/blog/category`),
    cachedProducts(`${apiBaseUrl}/product`),
    cachedProductCategories(`${apiBaseUrl}/product/category`),
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
          }]
        : undefined,
    })),
  ]
})
