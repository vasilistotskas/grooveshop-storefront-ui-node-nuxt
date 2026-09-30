import { resolve } from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import { COMPONENTS, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * Nothing optional may come between the price and the buy button.
 *
 * The buy box is the one column whose job is the sale, and everything
 * in it competes for the fold. `ProductOffers` sat above the controls
 * and, on a product with no offers of its own, opened its store-wide
 * list by default — about 570px of it — which put "Αγορά" at y=975 on
 * a 1440×900 desktop, below the fold, measured on the demo store
 * 2026-09-19. The delivery plan had always put the panel underneath.
 *
 * Only the DEFAULT tree is checked. `variants/webside` is frozen and
 * renders the order that store has today.
 */
const BODY = resolve(COMPONENTS, 'Storefront/ProductDetail.vue')

/** Anything that is supporting information, not a control. */
const BELOW_THE_BUTTON = [
  'ProductOffers',
  'ShippingFreeShippingNotice',
  'ProductNotifyMe',
]

/** Every component tag in the template, in source order. */
let tags: string[]

beforeAll(() => {
  tags = []
  walkElements(sfcTemplate(BODY), (node) => {
    tags.push(node.tag)
  })
})

describe('the product detail buy box', () => {
  it('renders the add-to-cart button', () => {
    // Guards the test itself: a rename would otherwise make every
    // assertion below vacuously true.
    expect(tags).toContain('ButtonProductAddToCart')
  })

  it('puts the add-to-cart button before the supporting panels', () => {
    // The FIRST add-to-cart is the real one; the second is the sticky
    // bar further down the template.
    const button = tags.indexOf('ButtonProductAddToCart')

    const tooEarly = BELOW_THE_BUTTON.filter((tag) => {
      const at = tags.indexOf(tag)
      return at !== -1 && at < button
    })

    expect(
      tooEarly,
      'these push the primary action of the page further down the buy box',
    ).toEqual([])
  })
})
