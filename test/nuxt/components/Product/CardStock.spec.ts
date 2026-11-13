import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Component } from 'vue'
import ProductCard from '~/components/Product/Card.vue'
import WebsideProductCard from '~/components/variants/webside/Product/Card.vue'
import WebsideAccountAreaProductCard from '~/components/variants/webside/AccountArea/Product/Card.vue'
import type { ProductOverrides } from '~~/test/fixtures/product'
import { makeProduct } from '~~/test/fixtures/product'
import { makeProductSearchHit } from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

mockNuxtImport('useB2BPricing', () => () => ({ register: vi.fn(), priceFor: () => undefined }))

/**
 * One stock rule on every card of every design (`lowStockLeft`, the rule
 * Django's `Product.stock_state` states): sold out is stock 0, low is
 * stock above 0 and at or below the product's own threshold, and a
 * threshold of 0 switches the hint off.
 */
const CARDS: { name: string, C: Component, soldOut: string }[] = [
  ...trees(ProductCard, WebsideProductCard).map(({ tree, C }) => ({
    name: `${tree} Product/Card`,
    C,
    soldOut: 'Εξαντλήθηκε',
  })),
  { name: 'webside AccountArea/Product/Card', C: WebsideAccountAreaProductCard, soldOut: 'Εξαντλημένο' },
]

describe.each(CARDS)('$name stock hint', ({ C, soldOut }) => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ productAlerts: false, productReviews: true })
  })

  const textOf = async (product: object) => {
    const wrapper = await mountSuspended(C, {
      props: { product },
      global: { stubs: { ImgWithFallback: true, ButtonProductAddToCart: true } },
      route: false,
    })
    return wrapper.text()
  }
  const textFor = (overrides: ProductOverrides) => textOf(makeProduct(overrides))

  it('says how few are left at or under the product\'s own threshold', async () => {
    expect(await textFor({ stock: 3, lowStockThreshold: 5 })).toContain('Μόνο 3 απέμειναν')
    expect(await textFor({ stock: 5, lowStockThreshold: 5 })).toContain('Μόνο 5 απέμειναν')
  })

  it('says nothing above the threshold', async () => {
    expect(await textFor({ stock: 6, lowStockThreshold: 5 })).not.toContain('Μόνο')
  })

  it('says nothing when the threshold is 0: the store switched the hint off', async () => {
    expect(await textFor({ stock: 3, lowStockThreshold: 0 })).not.toContain('Μόνο')
    expect(await textFor({ stock: 1, lowStockThreshold: 0 })).not.toContain('Μόνο')
  })

  it('says sold out, never "only 0 left", at stock 0', async () => {
    const text = await textFor({ stock: 0, lowStockThreshold: 5 })

    expect(text).toContain(soldOut)
    expect(text).not.toContain('Μόνο')
  })

  // Only a search hit may carry no threshold (`zProductMeiliSearchResult`
  // has it nullable); every product response has a number.
  it('says nothing for a search hit that carries no threshold', async () => {
    expect(await textOf(makeProductSearchHit({ stock: 3, lowStockThreshold: null }))).not.toContain('Μόνο')
  })
})
