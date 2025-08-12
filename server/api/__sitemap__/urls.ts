export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()

  const cachedBlogPosts = createCachedFetcher<BlogPost>(
    'cachedBlogPosts',
    60 * 60,
  )

  const cachedBlogCategories = createCachedFetcher<BlogCategory>(
    'cachedBlogCategories',
    60 * 60,
  )

  const allPosts = await cachedBlogPosts(`${config.apiBaseUrl}/blog/post`)
  const allCategories = await cachedBlogCategories(`${config.apiBaseUrl}/blog/category`)

  return [
    ...allCategories.map(category => asSitemapUrl({
      // @TODO
      // loc: category.absoluteUrl,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(category.updatedAt),
    })),
    ...allPosts.map(post => asSitemapUrl({
      // @TODO
      // loc: post.absoluteUrl,
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date(post.updatedAt),
    })),
  ]
})
