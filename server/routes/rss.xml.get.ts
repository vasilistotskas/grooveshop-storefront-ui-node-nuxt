import RSS from 'rss'
import type { SupportedLocale } from '~~/i18n/locales'

const RSS_CACHE_AGE = 60 * 60

const cachedBlogCategory = defineCachedFunction(
  async (url: string): Promise<BlogCategoryDetail> => {
    return await $fetch<BlogCategoryDetail>(url, { method: 'GET' })
  },
  {
    maxAge: RSS_CACHE_AGE,
    name: 'cachedBlogCategory',
    getKey: (url: string) => url,
  },
)

const cachedProductCategoryDetail = defineCachedFunction(
  async (url: string): Promise<ProductCategoryDetail> => {
    return await $fetch<ProductCategoryDetail>(url, { method: 'GET' })
  },
  {
    maxAge: RSS_CACHE_AGE,
    name: 'cachedProductCategoryDetail',
    getKey: (url: string) => url,
  },
)

const generateRssFeed = defineCachedFunction(
  async (locale: SupportedLocale, siteUrl: string, siteName: string, siteDescription: string, baseUrl: string, apiBaseUrl: string, mediaStreamPath: string): Promise<string> => {
    const feed = new RSS({
      title: siteName,
      description: siteDescription,
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

    const cachedBlogPosts = createCachedFetcher<BlogPost>('cachedBlogPosts', RSS_CACHE_AGE)
    const cachedProducts = createCachedFetcher<Product>('cachedProducts', RSS_CACHE_AGE)

    const [allPosts, allProducts] = await Promise.all([
      cachedBlogPosts(`${apiBaseUrl}/blog/post`),
      cachedProducts(`${apiBaseUrl}/product`),
    ])

    const blogPosts = allPosts.map(post => zBlogPost.parse(post))
    const activeProducts = allProducts.filter(product => product.active !== false)

    const blogItems = await processBlogPosts(blogPosts, locale, baseUrl, apiBaseUrl, mediaStreamPath)
    const productItems = await processProducts(activeProducts, locale, baseUrl, apiBaseUrl, mediaStreamPath)

    const allItems = [...blogItems, ...productItems].sort(
      (a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date)
        const dateB = b.date instanceof Date ? b.date : new Date(b.date)
        return dateB.getTime() - dateA.getTime()
      },
    )

    for (const item of allItems) {
      feed.item(item)
    }

    return feed.xml({ indent: true })
  },
  {
    name: 'RssFeed',
    maxAge: RSS_CACHE_AGE,
    staleMaxAge: RSS_CACHE_AGE * 24,
    swr: true,
    getKey: (locale: string) => `rss-${locale}`,
  },
)

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const siteConfig = getSiteConfig(event)
    const baseUrl = config.public.baseUrl
    const apiBaseUrl = config.apiBaseUrl

    const locale: SupportedLocale = (event.context.locale || siteConfig.defaultLocale).split('-')[0]

    const feedString = await generateRssFeed(
      locale,
      siteConfig.url,
      siteConfig.name,
      siteConfig.description,
      baseUrl,
      apiBaseUrl,
      config.mediaStreamPath,
    )

    setHeaders(event, {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 'max-age=3600, s-maxage=3600',
    })

    return feedString
  }
  catch (error) {
    log.error({ action: 'rss:generate', error })
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate RSS feed' })
  }
})

async function processBlogPosts(
  blogPosts: BlogPost[],
  locale: SupportedLocale,
  baseUrl: string,
  apiBaseUrl: string,
  mediaStreamPath: string,
): Promise<RSS.ItemOptions[]> {
  const items: RSS.ItemOptions[] = []

  // Pre-fetch all unique category IDs in parallel
  const uniqueCategoryIds = [...new Set(blogPosts.map(p => p.category).filter(Boolean))]
  const categoryResults = await Promise.allSettled(
    uniqueCategoryIds.map(id => cachedBlogCategory(`${apiBaseUrl}/blog/category/${id}`)),
  )
  const categoryMap = new Map(
    uniqueCategoryIds.map((id, i) => {
      const result = categoryResults[i]
      return [id, result?.status === 'fulfilled' ? result.value : null]
    }),
  )

  for (const post of blogPosts) {
    const translation = post.translations?.[locale] || Object.values(post.translations || {})[0]

    if (!translation) {
      log.warn('rss', `Post with ID ${post.id} has no translations available.`)
      continue
    }

    const mainImageUrl = encodeURI(`${mediaStreamPath}/${post.mainImagePath}/472/311/cover/attention/transparent/5/webp/100`)
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

    const category = categoryMap.get(post.category)
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
  baseUrl: string,
  apiBaseUrl: string,
  mediaStreamPath: string,
): Promise<RSS.ItemOptions[]> {
  const items: RSS.ItemOptions[] = []

  // Pre-fetch all unique category IDs in parallel
  const uniqueCategoryIds = [...new Set(products.map(p => p.category).filter(Boolean))]
  const categoryResults = await Promise.allSettled(
    uniqueCategoryIds.map(id => cachedProductCategoryDetail(`${apiBaseUrl}/product/category/${id}`)),
  )
  const categoryMap = new Map(
    uniqueCategoryIds.map((id, i) => {
      const result = categoryResults[i]
      return [id, result?.status === 'fulfilled' ? result.value : null]
    }),
  )

  for (const product of products) {
    const translation = product.translations?.[locale] || Object.values(product.translations || {})[0]

    if (!translation) {
      log.warn('rss', `Product with ID ${product.id} has no translations available.`)
      continue
    }

    const mainImageUrl = product.mainImagePath
      ? encodeURI(`${mediaStreamPath}/${product.mainImagePath}/472/311/cover/attention/transparent/5/webp/100`)
      : ''
    const mimeType = product.mainImagePath ? getMimeType(product.mainImagePath) : undefined

    let description = translation.description || translation.name || ''
    if (mainImageUrl) {
      description = `<img src="${mainImageUrl}" alt="${translation.name}" />\n` + description
    }

    const pubDate = new Date(product.createdAt)

    const categories: string[] = []
    if (product.category) {
      const category = categoryMap.get(product.category)
      const categoryTranslation = category?.translations?.[locale]
      if (categoryTranslation?.name) {
        categories.push(categoryTranslation.name)
      }
    }

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

    if (product.discountPercent && product.discountPercent > 0) {
      customElements.push({ 'product:discount': `${product.discountPercent}%` })
      customElements.push({ 'product:originalPrice': product.price })
    }

    if (typeof product.stock === 'number') {
      customElements.push({ 'product:availability': product.stock > 0 ? 'in stock' : 'out of stock' })
    }

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
