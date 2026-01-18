import RSS from 'rss'
import type { SupportedLocale } from '~~/i18n/locales'

const RSS_CACHE_AGE = 60 * 60

export default defineCachedEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const siteConfig = getSiteConfig(event)
    const baseUrl = config.public.baseUrl
    const apiBaseUrl = config.apiBaseUrl

    const locale: SupportedLocale = (event.context.locale || siteConfig.defaultLocale).split('-')[0]
    const siteUrl = siteConfig.url

    // Initialize feed
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
        product: 'http://www.buy.com/rss/module/productV2/',
      },
    })

    // Fetch blog posts and products in parallel
    const cachedBlogPosts = createCachedFetcher<BlogPost>('cachedBlogPosts', RSS_CACHE_AGE)
    const cachedProducts = createCachedFetcher<Product>(
      'cachedProducts',
      RSS_CACHE_AGE,
    )

    const [allPosts, allProducts] = await Promise.all([
      cachedBlogPosts(`${apiBaseUrl}/blog/post`),
      cachedProducts(`${apiBaseUrl}/product`),
    ])

    const blogPosts = allPosts.map(post => zBlogPost.parse(post))
    const activeProducts = allProducts.filter(product => product.active !== false)

    // Process blog posts
    const blogItems = await processBlogPosts(blogPosts, locale, config, baseUrl, apiBaseUrl)

    // Process products
    const productItems = await processProducts(activeProducts, locale, config, baseUrl, apiBaseUrl)

    // Combine and sort all items by date (newest first)
    const allItems = [...blogItems, ...productItems].sort(
      (a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date)
        const dateB = b.date instanceof Date ? b.date : new Date(b.date)
        return dateB.getTime() - dateA.getTime()
      },
    )

    // Add all items to feed
    for (const item of allItems) {
      feed.item(item)
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
}, {
  name: 'RssFeed',
  maxAge: RSS_CACHE_AGE, // 1 hour
  staleMaxAge: RSS_CACHE_AGE * 24, // Serve stale for 24 hours while revalidating
  swr: true,
})

async function processBlogPosts(
  blogPosts: BlogPost[],
  locale: SupportedLocale,
  config: ReturnType<typeof useRuntimeConfig>,
  baseUrl: string,
  apiBaseUrl: string,
): Promise<RSS.ItemOptions[]> {
  const items: RSS.ItemOptions[] = []

  const cachedCategory = defineCachedFunction(
    async (url: string): Promise<BlogCategoryDetail> => {
      return await $fetch<BlogCategoryDetail>(url, { method: 'GET' })
    },
    {
      maxAge: RSS_CACHE_AGE,
      name: 'cachedBlogCategory',
      getKey: (url: string) => url,
    },
  )

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

    const category = await cachedCategory(`${apiBaseUrl}/blog/category/${post.category}`)
    const categoryName = category?.translations?.[locale]?.name
    const categories = categoryName ? [categoryName] : []

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
      ...(fullContent ? [{ 'content:encoded': { _cdata: fullContent } }] : []),
    ]

    items.push({
      title: translation.title || 'Untitled Post',
      url: baseUrl + '/blog/post/' + post.id + '/' + post.slug,
      description,
      date: pubDate,
      guid: post.uuid || post.id.toString(),
      categories,
      enclosure: mainImageUrl && mimeType ? { url: mainImageUrl, type: mimeType } : undefined,
      custom_elements: customElements,
    })
  }

  return items
}

async function processProducts(
  products: Product[],
  locale: SupportedLocale,
  config: ReturnType<typeof useRuntimeConfig>,
  baseUrl: string,
  apiBaseUrl: string,
): Promise<RSS.ItemOptions[]> {
  const items: RSS.ItemOptions[] = []

  const cachedProductCategory = defineCachedFunction(
    async (url: string): Promise<ProductCategoryDetail> => {
      return await $fetch<ProductCategoryDetail>(url, {
        method: 'GET',
      })
    },
    {
      maxAge: RSS_CACHE_AGE,
      name: 'cachedProductCategoryDetail',
      getKey: (url: string) => url,
    },
  )

  for (const product of products) {
    const translation = product.translations?.[locale] || Object.values(product.translations || {})[0]

    if (!translation) {
      console.warn(`Product with ID ${product.id} has no translations available.`)
      continue
    }

    const mainImageUrl = product.mainImagePath
      ? encodeURI(`${config.mediaStreamPath}/${product.mainImagePath}/472/311/cover/attention/transparent/5/webp/100`)
      : ''
    const mimeType = product.mainImagePath ? getMimeType(product.mainImagePath) : undefined

    // Build description with product details
    let description = translation.description || translation.name || ''
    if (mainImageUrl) {
      description = `<img src="${mainImageUrl}" alt="${translation.name}" />\n` + description
    }

    const pubDate = new Date(product.createdAt)

    // Get product category
    const categories: string[] = []
    if (product.category) {
      try {
        const category = await cachedProductCategory(`${apiBaseUrl}/product/category/${product.category}`)
        const categoryTranslation = category?.translations?.[locale]
        if (categoryTranslation?.name) {
          categories.push(categoryTranslation.name)
        }
      }
      catch {
        // Category fetch failed, continue without category
      }
    }

    // Build custom elements with product-specific data
    const customElements: Array<Record<string, unknown>> = [
      { 'atom:updated': new Date(product.updatedAt).toISOString() },
      { 'product:price': product.finalPrice },
      { 'product:currency': 'EUR' },
    ]

    if (mainImageUrl) {
      customElements.push({
        'media:content': {
          _attr: {
            url: mainImageUrl,
            type: mimeType || 'image/jpeg',
            medium: 'image',
            width: '472',
            height: '311',
          },
        },
      })
      customElements.push({ 'media:title': translation.name })
    }

    // Add discount info if applicable
    if (product.discountPercent && product.discountPercent > 0) {
      customElements.push({ 'product:discount': `${product.discountPercent}%` })
      customElements.push({ 'product:originalPrice': product.price })
    }

    // Add stock info
    if (typeof product.stock === 'number') {
      customElements.push({ 'product:availability': product.stock > 0 ? 'in stock' : 'out of stock' })
    }

    // Add review info
    if (product.reviewCount > 0) {
      customElements.push({ 'product:rating': product.reviewAverage })
      customElements.push({ 'product:reviewCount': product.reviewCount })
    }

    items.push({
      title: translation.name || `Product #${product.id}`,
      url: baseUrl + '/products/' + product.id + '/' + product.slug,
      description,
      date: pubDate,
      guid: `product-${product.uuid || product.id}`,
      categories,
      enclosure: mainImageUrl && mimeType ? { url: mainImageUrl, type: mimeType } : undefined,
      custom_elements: customElements,
    })
  }

  return items
}
