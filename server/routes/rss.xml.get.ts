import RSS from 'rss'

export default defineCachedEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const siteConfig = useSiteConfig(event)

    const cachedBlogPosts = createCachedFetcher<BlogPost>(
      'cachedBlogPosts',
      60 * 60,
    )

    const locale = siteConfig.defaultLocale || 'el'
    const siteUrl = siteConfig.url
    const apiBaseUrl = config.apiBaseUrl

    const allPosts = await cachedBlogPosts(`${apiBaseUrl}/blog/post?expand=true`)
    const blogPosts = allPosts.map(post => ZodBlogPost.parse(post))

    const feed = new RSS({
      title: siteConfig.name,
      description: siteConfig.description,
      site_url: siteUrl,
      feed_url: `${siteUrl}/rss.xml`,
      language: locale,
      pubDate: new Date().toISOString(),
      image_url: `${siteUrl}/screenshots/1024x593.png`,
      ttl: 60,
    })

    for (const post of blogPosts) {
      const translation = post.translations?.[locale] || Object.values(post.translations || {})[0]

      if (!translation) {
        console.warn(`Post with ID ${post.id} has no translations available.`)
        continue
      }

      const postUrl = new URL(post.absoluteUrl, siteUrl).toString()
      const mainImageUrl = config.mediaStreamPath + '/' + post.mainImagePath + '/472/311/cover/attention/transparent/5/webp/100'
      const mimeType = post.mainImagePath ? getMimeType(post.mainImagePath) : undefined
      let description = translation.subtitle || ''
      if (mainImageUrl) {
        description = `<img src="${mainImageUrl}" alt="${translation.title}" />\n` + description
      }

      const pubDate = post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt)

      const category = getEntityObject(post.category)
      const categoryName = category?.translations?.[locale]?.name
      const categories = categoryName ? [categoryName] : []

      const guid = post.uuid || post.id.toString()

      const enclosure = mainImageUrl && mimeType ? { url: mainImageUrl, type: mimeType } : undefined

      feed.item({
        title: translation.title || 'Untitled Post',
        url: postUrl,
        description: description,
        date: pubDate,
        categories,
        guid: guid,
        ...(enclosure ? { enclosure } : {}),
      })
    }

    const feedString = feed.xml({ indent: true })

    event.node.res.setHeader('Content-Type', 'application/rss+xml; charset=UTF-8')
    event.node.res.end(feedString)
  }
  catch (error) {
    console.error('Error generating RSS feed:', error)
    return createError({ statusCode: 500, statusMessage: 'Failed to generate RSS feed' })
  }
}, { maxAge: 60 * 60 })
