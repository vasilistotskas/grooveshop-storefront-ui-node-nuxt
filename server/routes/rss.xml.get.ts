import RSS from 'rss'
import type { SupportedLocale } from '~~/i18n/locales'

export default defineCachedEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    // @ts-ignore
    const siteConfig = useSiteConfig(event)
    const baseUrl = config.public.baseUrl

    const cachedBlogPosts = createCachedFetcher<BlogPost>(
      'cachedBlogPosts',
      60 * 60,
    )

    const locale: SupportedLocale = (event.context.locale || siteConfig.defaultLocale).split('-')[0]
    const siteUrl = siteConfig.url
    const apiBaseUrl = config.apiBaseUrl

    const allPosts = await cachedBlogPosts(`${apiBaseUrl}/blog/post`)
    const blogPosts = allPosts.map(post => zBlogPost.parse(post))

    const feed = new RSS({
      title: siteConfig.name,
      description: siteConfig.description,
      site_url: siteUrl,
      feed_url: `${siteUrl}/rss.xml`,
      language: locale,
      pubDate: new Date().toISOString(),
      image_url: `${siteUrl}/screenshots/1024x593.png`,
      ttl: 60,
      custom_namespaces: {
        media: 'http://search.yahoo.com/mrss/',
        atom: 'http://www.w3.org/2005/Atom',
        dc: 'http://purl.org/dc/elements/1.1/',
      },
    })

    for (const post of blogPosts) {
      const translation = post.translations?.[locale] || Object.values(post.translations || {})[0]

      if (!translation) {
        console.warn(`Post with ID ${post.id} has no translations available.`)
        continue
      }

      const mainImageUrl = encodeURI(`${config.mediaStreamPath}/${post.mainImagePath}/472/311/cover/attention/transparent/5/webp/100`)
      const mimeType = post.mainImagePath ? getMimeType(post.mainImagePath) : undefined

      let description = translation.subtitle || ''

      const fullContent = translation.body || ''

      if (mainImageUrl) {
        description = `<img src="${mainImageUrl}" alt="${translation.title}" />\n` + description
      }

      let pubDate = new Date()
      if (post.publishedAt) {
        pubDate = new Date(post.publishedAt)
      }
      else if (post.createdAt) {
        pubDate = new Date(post.createdAt)
      }

      const cachedCategory = defineCachedFunction(
        async (url: string): Promise<BlogCategoryDetail> => {
          return await $fetch<BlogCategoryDetail>(url, {
            method: 'GET',
          })
        },
        {
          maxAge: 60 * 60,
          name: `cachedCategory-${post.category}`,
          getKey: (url: string) => url,
        },
      )

      const category = await cachedCategory(`${apiBaseUrl}/blog/category/${post.category}`)

      const categoryName = category?.translations?.[locale]?.name
      const categories = categoryName ? [categoryName] : []

      const guid = post.uuid || post.id.toString()

      const enclosure = mainImageUrl && mimeType ? { url: mainImageUrl, type: mimeType } : undefined

      const wordCount = fullContent.split(/\s+/).length
      const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200))

      const customElements = [
        { 'media:content': {
          _attr: {
            url: mainImageUrl,
            type: mimeType || 'image/jpeg',
            medium: 'image',
            width: '472',
            height: '311',
          },
        } },
        { 'media:title': translation.title },
        { 'media:description': translation.subtitle },
        { readingTime: `${readingTimeMinutes} min read` },
        { 'atom:updated': new Date(post.updatedAt).toISOString() },
      ]

      feed.item({
        title: translation.title || 'Untitled Post',
        url: baseUrl + '/blog/post/' + post.id + '/' + post.slug,
        description: description,
        custom_elements: [
          ...customElements,
          ...(fullContent ? [{ 'content:encoded': { _cdata: fullContent } }] : []),
        ],
        date: pubDate,
        categories,
        guid: guid,
        ...(enclosure ? { enclosure } : {}),
      })
    }

    const feedString = feed.xml({ indent: true })

    setHeaders(event, {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 'max-age=3600, s-maxage=3600',
    })

    return feedString
  }
  catch (error) {
    console.error('Error generating RSS feed:', error)
    return createError({ statusCode: 500, statusMessage: 'Failed to generate RSS feed' })
  }
})
