type SchemaProduct = Pick<
  ProductRetrieve,
  'id' | 'stock' | 'finalPrice' | 'effectivePrice' | 'priorPrice'
  | 'announcedDiscountPercent' | 'reductionStartedAt' | 'reviewCount' | 'reviewAverage'
  | 'brandName' | 'weight' | 'attributes'
>

/** The product's variant group: the other variants, each on its own page. */
export interface ProductGroupSchema {
  id: number
  name: string
  /** The Schema.org properties the variants differ by. */
  variesBy: string[]
  /** The other variants' page paths. */
  variantPaths: string[]
}

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
  variantGroup?: ProductGroupSchema
  /** `null` with the store's reviews off: no rating leaves the page. */
  reviews: ProductReview[] | null
  /** How a reviewer without a name is called, in the page's language. */
  anonymousReviewer: string
  /** A review's comment in the page's language (`extractTranslated`). */
  reviewComment: (review: ProductReview) => string | undefined
}

/** The most reviews a page's structured data lists. */
const SCHEMA_REVIEW_LIMIT = 5

/** The attributes a Product states as properties of its own. */
const PRODUCT_PROPERTIES = new Set(['color', 'size', 'material', 'pattern'])

/** Fewer units than this in stock read as limited availability. */
const LIMITED_STOCK = 5

/** Django's weight units as UN/CEFACT codes, what `unitCode` takes. */
const WEIGHT_UNIT_CODES: Record<string, string> = {
  g: 'GRM',
  kg: 'KGM',
  lb: 'LBR',
  oz: 'ONZ',
  tonne: 'TNE',
}

/** The product's weight, when the store has set one. */
function partition<T>(items: readonly T[], test: (item: T) => boolean): [T[], T[]] {
  return [items.filter(test), items.filter(item => !test(item))]
}

function weightOf(weight: SchemaProduct['weight']) {
  const unitCode = weight?.unit ? WEIGHT_UNIT_CODES[weight.unit] : undefined
  if (!weight?.value || !unitCode) return undefined
  return { '@type': 'QuantitativeValue' as const, 'value': weight.value, unitCode }
}

/**
 * A variant's group, as Google's multi-page pattern has it: every variant
 * page repeats the group, and the variants on other pages are their URLs.
 */
function productGroup(group: ProductGroupSchema, brand: string) {
  return {
    '@type': 'ProductGroup' as const,
    'name': group.name,
    'productGroupID': String(group.id),
    'brand': { '@type': 'Brand' as const, 'name': brand },
    'variesBy': group.variesBy.length > 0 ? group.variesBy : undefined,
    'hasVariant': group.variantPaths.map(url => ({ url })),
  }
}

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
  // A store that sells its own products names no brand on them.
  const brand = product.brandName || input.storeName
  const [properties, specifications] = partition(
    product.attributes,
    attribute => PRODUCT_PROPERTIES.has(attribute.schemaProperty),
  )

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
      'name': brand,
    },
    ...Object.fromEntries(properties.map(attribute => [attribute.schemaProperty, attribute.value])),
    isVariantOf: input.variantGroup ? productGroup(input.variantGroup, brand) : undefined,
    weight: weightOf(product.weight),
    // The specifications the page shows, so a search engine or a shopping
    // agent reads them as data rather than from the description.
    additionalProperty: specifications.length > 0
      ? specifications.map(attribute => ({
          '@type': 'PropertyValue' as const,
          'name': attribute.attributeName,
          'value': attribute.value,
        }))
      : undefined,
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
      // The sale price holds from when the reduction started: never an
      // invented end date, and nothing for a price that is not a sale.
      'validFrom': announcement ? product.reductionStartedAt ?? undefined : undefined,
      'availability': availability(product.stock ?? 0),
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
