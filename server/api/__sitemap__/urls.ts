const SITEMAP_CACHE_AGE = 60 * 60

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl
  const apiBaseUrl = config.apiBaseUrl

  // Blog fetchers
  const cachedBlogPosts = createCachedFetcher<BlogPost>(
    'cachedBlogPosts',
    SITEMAP_CACHE_AGE,
  )
  const cachedBlogCategories = createCachedFetcher<BlogCategory>(
    'cachedBlogCategories',
    SITEMAP_CACHE_AGE,
  )

  // Product fetchers
  const cachedProducts = createCachedFetcher<Product>(
    'cachedProducts',
    SITEMAP_CACHE_AGE,
  )
  const cachedProductCategories = createCachedFetcher<ProductCategory>(
    'cachedProductCategories',
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
