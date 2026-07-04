import { describe, expect, it, vi } from 'vitest'
import { encodeMediaStreamPath, stripHtmlTags } from '../../../../shared/utils/html'
import type { Product } from '../../../../shared/openapi/types.gen'

// feed.ts registers cached functions at module scope and leans on Nitro
// auto-imports — provide them as globals before the dynamic import below.
vi.stubGlobal('defineCachedFunction', (fn: unknown) => fn)
vi.stubGlobal('stripHtmlTags', stripHtmlTags)
vi.stubGlobal('encodeMediaStreamPath', encodeMediaStreamPath)
vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const {
  buildProductFeedXml,
  decodeHtmlEntities,
  escapeXml,
  formatFeedPrice,
  productToFeedItem,
} = await import('../../../../server/utils/feed')
type FeedItemContext = import('../../../../server/utils/feed').FeedItemContext

function makeProduct(overrides: Record<string, unknown> = {}): Product {
  return {
    id: 42,
    slug: 'wireless-headphones',
    category: 7,
    variantGroup: null,
    translations: {
      el: {
        name: 'Ασύρματα ακουστικά',
        description: '<p>Ασύρματα ακουστικά &amp; θήκη φόρτισης</p>',
      },
    },
    price: 100,
    vatValue: 24,
    finalPrice: 124,
    discountPercent: 0,
    stock: 3,
    active: true,
    mainImagePath: 'media/uploads/products/ακουστικά.jpg',
    brandName: 'Acme Audio',
    ...overrides,
  } as unknown as Product
}

function makeContext(overrides: Partial<FeedItemContext> = {}): FeedItemContext {
  return {
    siteName: 'Grooveshop',
    baseUrl: 'https://example.test',
    mediaStreamPath: 'https://assets.example.test/media_stream-image',
    categoryNames: new Map([[7, 'Ακουστικά']]),
    ...overrides,
  }
}

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &apos;')
  })

  it('preserves Greek text verbatim', () => {
    expect(escapeXml('Ασύρματα ακουστικά')).toBe('Ασύρματα ακουστικά')
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes named, numeric and hex entities', () => {
    expect(decodeHtmlEntities('Q&amp;A&nbsp;&#8364;&#x20AC;')).toBe('Q&A €€')
  })
})

describe('formatFeedPrice', () => {
  it('formats with two decimals and ISO currency code', () => {
    expect(formatFeedPrice(12.3)).toBe('12.30 EUR')
    expect(formatFeedPrice(0)).toBe('0.00 EUR')
  })
})

describe('productToFeedItem', () => {
  it('maps a full product to a feed item', () => {
    const item = productToFeedItem(makeProduct(), makeContext())

    expect(item).not.toBeNull()
    expect(item).toContain('<g:id>42</g:id>')
    expect(item).toContain('<title>Ασύρματα ακουστικά</title>')
    expect(item).toContain(
      '<link>https://example.test/products/42/wireless-headphones</link>',
    )
    expect(item).toContain('<g:availability>in stock</g:availability>')
    expect(item).toContain('<g:condition>new</g:condition>')
    expect(item).toContain('<g:price>124.00 EUR</g:price>')
    expect(item).toContain('<g:brand>Acme Audio</g:brand>')
    expect(item).toContain('<g:product_type>Ακουστικά</g:product_type>')
    expect(item).toContain('/1000/1000/contain/center/FFFFFF/5/85.jpeg</g:image_link>')
  })

  it('strips HTML from the description without double-encoding entities', () => {
    const item = productToFeedItem(makeProduct(), makeContext())

    expect(item).toContain(
      '<description>Ασύρματα ακουστικά &amp; θήκη φόρτισης</description>',
    )
    expect(item).not.toContain('&amp;amp;')
    expect(item).not.toContain('<p>')
  })

  it('falls back to the name when the description is empty', () => {
    const item = productToFeedItem(
      makeProduct({
        translations: { el: { name: 'Ακουστικά', description: '' } },
      }),
      makeContext(),
    )

    expect(item).toContain('<description>Ακουστικά</description>')
  })

  it('maps stock to availability', () => {
    const inStock = productToFeedItem(makeProduct({ stock: 1 }), makeContext())
    const outOfStock = productToFeedItem(makeProduct({ stock: 0 }), makeContext())
    const noStockField = productToFeedItem(
      makeProduct({ stock: undefined }),
      makeContext(),
    )

    expect(inStock).toContain('<g:availability>in stock</g:availability>')
    expect(outOfStock).toContain('<g:availability>out of stock</g:availability>')
    expect(noStockField).toContain('<g:availability>out of stock</g:availability>')
  })

  it('emits sale_price only for a genuine discount', () => {
    const discounted = productToFeedItem(
      makeProduct({ discountPercent: 10, finalPrice: 114 }),
      makeContext(),
    )
    const fullPrice = productToFeedItem(makeProduct(), makeContext())
    const bogusDiscount = productToFeedItem(
      makeProduct({ discountPercent: 10, finalPrice: 124 }),
      makeContext(),
    )

    expect(discounted).toContain('<g:price>124.00 EUR</g:price>')
    expect(discounted).toContain('<g:sale_price>114.00 EUR</g:sale_price>')
    expect(fullPrice).not.toContain('<g:sale_price>')
    expect(bogusDiscount).not.toContain('<g:sale_price>')
  })

  it('skips products without a default-locale name or main image', () => {
    expect(
      productToFeedItem(makeProduct({ translations: {} }), makeContext()),
    ).toBeNull()
    expect(
      productToFeedItem(makeProduct({ mainImagePath: '' }), makeContext()),
    ).toBeNull()
  })

  it('falls back to the site name when the product has no brand', () => {
    const item = productToFeedItem(
      makeProduct({ brandName: null }),
      makeContext(),
    )

    expect(item).toContain('<g:brand>Grooveshop</g:brand>')
  })

  it('omits product_type when the category name is unresolved', () => {
    const item = productToFeedItem(
      makeProduct(),
      makeContext({ categoryNames: new Map() }),
    )

    expect(item).not.toContain('<g:product_type>')
  })

  it('emits item_group_id only when the product belongs to a variant group', () => {
    const grouped = productToFeedItem(
      makeProduct({ variantGroup: 9 }),
      makeContext(),
    )
    const ungrouped = productToFeedItem(makeProduct(), makeContext())

    expect(grouped).toContain('<g:item_group_id>9</g:item_group_id>')
    expect(ungrouped).not.toContain('<g:item_group_id>')
  })

  it('truncates the title to 200 characters', () => {
    const item = productToFeedItem(
      makeProduct({
        translations: { el: { name: 'α'.repeat(250), description: '' } },
      }),
      makeContext(),
    )

    expect(item).toContain(`<title>${'α'.repeat(200)}</title>`)
  })
})

describe('buildProductFeedXml', () => {
  it('produces an RSS 2.0 document with the Google Merchant namespace', () => {
    const xml = buildProductFeedXml(
      {
        title: 'Grooveshop',
        link: 'https://example.test',
        description: 'Το κατάστημά μας',
      },
      ['    <item>\n      <g:id>1</g:id>\n    </item>'],
    )

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain(
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    )
    expect(xml).toContain('<title>Grooveshop</title>')
    expect(xml).toContain('<link>https://example.test</link>')
    expect(xml).toContain('<description>Το κατάστημά μας</description>')
    expect(xml).toContain('<g:id>1</g:id>')
    expect(xml.trimEnd().endsWith('</rss>')).toBe(true)
  })
})
