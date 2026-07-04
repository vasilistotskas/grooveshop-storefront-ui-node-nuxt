import { DEFAULT_LOCALE } from '~~/i18n/locales'

/**
 * Google-Merchant-format product feed (RSS 2.0 + ``xmlns:g``) consumed by
 * Meta Commerce Manager and TikTok Ads Manager. Both platforms ingest the
 * same dialect; ``FeedKind`` only namespaces the cache and is the seam for
 * future per-platform divergence (e.g. TikTok ``g:video_link``).
 *
 * Spec constraints encoded here (Meta catalog reference / TikTok catalog
 * product parameters):
 *   - price format ``"12.34 EUR"`` — dot decimal, space, ISO 4217 code
 *   - availability enum: ``in stock`` | ``out of stock``
 *   - images JPEG/PNG only (never WebP), ≥500×500
 *   - ``g:id`` must equal the pixel/CAPI ``content_ids`` — always
 *     ``String(product.id)``, never sku/uuid
 */
export type FeedKind = 'meta' | 'tiktok'

export interface FeedChannel {
  title: string
  link: string
  description: string
}

export interface FeedItemContext {
  siteName: string
  baseUrl: string
  mediaStreamPath: string
  categoryNames: ReadonlyMap<number, string>
}

const FEED_CACHE_AGE = 60 * 60
const FEED_TITLE_MAX = 200
const FEED_DESCRIPTION_MAX = 9999
// Meta requires ≥500×500 JPEG/PNG. ``FFFFFF`` is not '#'-prefixed hex, so the
// media-stream ``parseColor`` falls back to opaque white — deterministic white
// background once flattened into JPEG ('#' cannot travel in a URL path, and
// ``transparent`` flattens unpredictably).
const FEED_IMAGE_SEGMENT = '1000/1000/contain/center/FFFFFF/5/85.jpeg'

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

/**
 * Resolve entities that survive ``stripHtmlTags`` (``&amp;``, ``&nbsp;``,
 * numeric refs …) so ``escapeXml`` doesn't double-encode them into the feed.
 */
export function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number(dec)))
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', '\'')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

export function formatFeedPrice(amount: number): string {
  return `${amount.toFixed(2)} EUR`
}

/**
 * Map one product to a feed ``<item>``. Returns ``null`` for products the
 * platforms would reject anyway (no default-locale name, no image).
 */
export function productToFeedItem(
  product: Product,
  ctx: FeedItemContext,
): string | null {
  const translation = product.translations?.[DEFAULT_LOCALE]
  const name = translation?.name
  if (!name || !product.mainImagePath) {
    return null
  }

  const title = name.slice(0, FEED_TITLE_MAX)
  const rawDescription = translation?.description
    ? decodeHtmlEntities(stripHtmlTags(translation.description)).trim()
    : ''
  const description = (rawDescription || name).slice(0, FEED_DESCRIPTION_MAX)

  const link = `${ctx.baseUrl}/products/${product.id}/${product.slug}`
  const imageLink = `${ctx.mediaStreamPath}/${encodeMediaStreamPath(product.mainImagePath)}/${FEED_IMAGE_SEGMENT}`
  const availability = (product.stock ?? 0) > 0 ? 'in stock' : 'out of stock'

  // ``price`` is net; the advertised regular price must include VAT.
  const regularPrice = product.price + product.vatValue
  const hasSalePrice
    = (product.discountPercent ?? 0) > 0 && product.finalPrice < regularPrice
  const brand = product.brandName || ctx.siteName
  const categoryName = product.category
    ? ctx.categoryNames.get(product.category)
    : undefined

  const fields = [
    `<g:id>${product.id}</g:id>`,
    `<title>${escapeXml(title)}</title>`,
    `<description>${escapeXml(description)}</description>`,
    `<link>${escapeXml(link)}</link>`,
    `<g:image_link>${escapeXml(imageLink)}</g:image_link>`,
    `<g:availability>${availability}</g:availability>`,
    `<g:condition>new</g:condition>`,
    `<g:price>${formatFeedPrice(regularPrice)}</g:price>`,
    ...(hasSalePrice
      ? [`<g:sale_price>${formatFeedPrice(product.finalPrice)}</g:sale_price>`]
      : []),
    `<g:brand>${escapeXml(brand)}</g:brand>`,
    ...(categoryName
      ? [`<g:product_type>${escapeXml(categoryName)}</g:product_type>`]
      : []),
    ...(product.variantGroup !== null && product.variantGroup !== undefined
      ? [`<g:item_group_id>${product.variantGroup}</g:item_group_id>`]
      : []),
  ]

  return `    <item>\n      ${fields.join('\n      ')}\n    </item>`
}

export function buildProductFeedXml(
  channel: FeedChannel,
  items: string[],
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.link)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

// Namespaced to avoid collision with the rss.xml/sitemap fetchers, which
// register the same logical fetches under different TTLs (see the note in
// server/routes/rss.xml.get.ts).
const cachedFeedCategory = defineCachedFunction(
  async (url: string) => {
    const raw = await $fetch(url, { method: 'GET' })
    return parseDataAs(raw, zProductCategoryDetail)
  },
  {
    maxAge: FEED_CACHE_AGE,
    name: 'feeds:product-category',
    getKey: (url: string) => url,
  },
)

export const generateProductFeed = defineCachedFunction(
  async (
    kind: FeedKind,
    siteUrl: string,
    siteName: string,
    siteDescription: string,
    baseUrl: string,
    apiBaseUrl: string,
    mediaStreamPath: string,
  ): Promise<string> => {
    const cachedProducts = createCachedFetcher<Product>(
      'feeds:products',
      FEED_CACHE_AGE,
    )

    // page_size=100 is the paginator max; createCachedFetcher follows next
    // links for at most 100 pages → 10k-product ceiling.
    const allProducts = await cachedProducts(
      `${apiBaseUrl}/product?page_size=100`,
    )
    if (allProducts.length >= 10_000) {
      log.warn('feeds', 'Product fetch hit the 10k pagination ceiling — feed may be truncated.')
    }

    const products = allProducts.filter(product => product.active !== false)

    const uniqueCategoryIds = [
      ...new Set(products.map(product => product.category).filter(Boolean)),
    ]
    const categoryResults = await Promise.allSettled(
      uniqueCategoryIds.map(id =>
        cachedFeedCategory(`${apiBaseUrl}/product/category/${id}`),
      ),
    )
    const categoryNames = new Map<number, string>()
    uniqueCategoryIds.forEach((id, index) => {
      const result = categoryResults[index]
      const categoryName = result?.status === 'fulfilled'
        ? result.value.translations?.[DEFAULT_LOCALE]?.name
        : undefined
      if (categoryName) {
        categoryNames.set(id, categoryName)
      }
    })

    const ctx: FeedItemContext = {
      siteName,
      baseUrl,
      mediaStreamPath,
      categoryNames,
    }

    const items: string[] = []
    let skipped = 0
    for (const product of products) {
      const item = productToFeedItem(product, ctx)
      if (item === null) {
        skipped++
        continue
      }
      items.push(item)
    }
    if (skipped > 0) {
      log.warn('feeds', `Skipped ${skipped} product(s) without a ${DEFAULT_LOCALE} name or main image.`)
    }

    return buildProductFeedXml(
      { title: siteName, link: siteUrl, description: siteDescription },
      items,
    )
  },
  {
    name: 'ProductFeed',
    maxAge: FEED_CACHE_AGE,
    staleMaxAge: FEED_CACHE_AGE * 24,
    swr: true,
    getKey: (kind: FeedKind) => `feed-${kind}`,
  },
)
