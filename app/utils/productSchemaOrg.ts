type SchemaProduct = Pick<
  ProductRetrieve,
  'id' | 'stock' | 'finalPrice' | 'effectivePrice' | 'priorPrice'
  | 'announcedDiscountPercent' | 'reviewCount' | 'reviewAverage'
>

interface ProductSchemaInput {
  product: SchemaProduct
  name: string
  description: string
  /** The canonical product URL. */
  url: string
  imageUrls: string[]
  storeName: string
  currency: string
  /** The category trail by name ("Φόρτιση > Power banks"), when known. */
  category?: string
  /** `null` with the store's reviews off: no rating leaves the page. */
  reviews: ProductReview[] | null
  /** How a reviewer without a name is called, in the page's language. */
  anonymousReviewer: string
  /** A review's comment in the page's language (`extractTranslated`). */
  reviewComment: (review: ProductReview) => string | undefined
}

/** The most reviews a page's structured data lists. */
const SCHEMA_REVIEW_LIMIT = 5

/** Fewer units than this in stock read as limited availability. */
const LIMITED_STOCK = 5

function availability(stock: number): string {
  if (stock === 0) return 'https://schema.org/OutOfStock'
  if (stock <= LIMITED_STOCK) return 'https://schema.org/LimitedAvailability'
  return 'https://schema.org/InStock'
}

/**
 * The Product node of a product page, for `defineProduct`, built once for
 * every component tree.
 *
 * `sku` is the product id: the feeds' `g:id` (and the pixels' content
 * ids) are the id, and Merchant Center matches the offer a page's markup
 * describes to the feed's by that identifier. A uuid here made Google
 * list a crawled copy of each page beside the feed's product.
 */
export function productSchemaOrg(input: ProductSchemaInput) {
  const { product, reviews } = input
  const announcement = productAnnouncement(product)
  const id = String(product.id)

  return {
    name: input.name,
    description: input.description,
    sku: id,
    productID: id,
    image: input.imageUrls.length > 0 ? input.imageUrls : undefined,
    url: input.url,
    category: input.category || undefined,
    brand: {
      '@type': 'Brand' as const,
      'name': input.storeName,
    },
    offers: {
      '@type': 'Offer' as const,
      'price': productCurrentPrice(product).toFixed(2),
      'priceCurrency': input.currency,
      // A strikethrough price is an announcement: only the prior price
      // of a reduction that may be announced.
      'priceSpecification': announcement
        ? [{
            '@type': 'UnitPriceSpecification' as const,
            'priceType': 'https://schema.org/StrikethroughPrice',
            'price': announcement.priorPrice.toFixed(2),
            'priceCurrency': input.currency,
          }]
        : undefined,
      'availability': availability(product.stock),
      'itemCondition': 'https://schema.org/NewCondition',
      'url': input.url,
      'seller': {
        '@type': 'Organization' as const,
        'name': input.storeName,
      },
    },
    aggregateRating: reviews && product.reviewCount > 0
      ? {
          '@type': 'AggregateRating' as const,
          'ratingValue': product.reviewAverage || 0,
          'reviewCount': product.reviewCount,
          'bestRating': 10,
          'worstRating': 1,
        }
      : undefined,
    review: reviews && reviews.length > 0
      ? reviews.slice(0, SCHEMA_REVIEW_LIMIT).map(review => ({
          '@type': 'Review' as const,
          'author': {
            '@type': 'Person' as const,
            // The name the page shows: first name and initial.
            'name': reviewerName(review.user) ?? input.anonymousReviewer,
          },
          'reviewRating': {
            '@type': 'Rating' as const,
            'ratingValue': review.rate,
            'bestRating': 10,
            'worstRating': 1,
          },
          'datePublished': review.publishedAt || review.createdAt,
          'reviewBody': input.reviewComment(review) || undefined,
        }))
      : undefined,
  }
}
