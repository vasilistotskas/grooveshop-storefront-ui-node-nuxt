import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { APP, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * What a Microsoft Clarity recording must not read.
 *
 * Clarity's default mode hides input values, numbers and email addresses, and
 * sends the rest of the page's text to Microsoft: a shopper's name and street
 * address on a page included. `data-clarity-mask` masks an element and all it
 * contains in the browser, so the content is never uploaded
 * (learn.microsoft.com/clarity/setup-and-installation/clarity-masking).
 *
 * A private surface carries it in every design.
 */
const PRIVATE_SURFACES = [
  'layouts/checkout.vue',
  'components/Chrome/AccountShell.vue',
  'components/variants/webside/Chrome/AccountShell.vue',
  'components/Storefront/CheckoutSuccess.vue',
  'components/variants/webside/Storefront/CheckoutSuccess.vue',
  'components/Chrome/AccountMenu.vue',
  'components/Chrome/AccountSheet.vue',
  'components/variants/webside/Page/BurgerMenu.vue',
]

describe('Microsoft Clarity masking', () => {
  it.each(PRIVATE_SURFACES)('%s masks its private content', (file) => {
    let masked = 0
    walkElements(sfcTemplate(resolve(APP, file)), (node) => {
      if (node.props.some(prop => prop.name === 'data-clarity-mask')) masked += 1
    })
    expect(masked).toBeGreaterThan(0)
  })
})
