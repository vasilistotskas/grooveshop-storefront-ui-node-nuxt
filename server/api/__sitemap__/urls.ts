const cachedBlogPosts = createCachedFetcher<BlogPost>(
  'cachedBlogPosts',
  60 * 60,
)

const cachedBlogCategories = createCachedFetcher<BlogCategory>(
  'cachedBlogCategories',
  60 * 60,
)

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()

  const allPosts = await cachedBlogPosts(`${config.public.apiBaseUrl}/blog/post`)
  const allCategories = await cachedBlogCategories(`${config.public.apiBaseUrl}/blog/category`)

  return [
    ...allCategories.map(category => asSitemapUrl({
      loc: category.absoluteUrl,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(category.updatedAt),
    })),
    ...allPosts.map(post => asSitemapUrl({
      loc: post.absoluteUrl,
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date(post.updatedAt),
    })),
  ]
})
