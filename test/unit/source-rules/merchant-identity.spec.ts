import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENTS, callsIn, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * A storefront has to say who is selling it to you, "easily, directly
 * and permanently accessible" (e-Commerce Directive 2000/31/EC art.
 * 5(1)) and "σε εμφανές σημείο" (N. 4919/2022 art. 22 §4).
 *
 * "Permanently accessible" and "prominent" is why the identity lives in
 * the footer — on every page — rather than on a single legal page. The
 * default footer is one component for every width; webside's
 * tree picks a desktop or a mobile footer by device, so a mobile
 * shopper who never sees its desktop footer is owed the same disclosure
 * and both are checked. No single render shows them all, so the
 * templates are read instead. What the block renders is
 * `test/nuxt/components/MerchantIdentity.spec.ts`; where webside's footers
 * place it (under the About column) is
 * `test/nuxt/components/variants/webside/Footer/MerchantIdentity.spec.ts`.
 */
describe('the merchant identity', () => {
  it.each([
    ['default', 'Chrome/Footer.vue', 'MerchantIdentity'],
    // The webside design renders its own copy under the Webside prefix.
    ['webside desktop', 'variants/webside/Footer/Desktop.vue', 'WebsideMerchantIdentity'],
    ['webside mobile', 'variants/webside/Footer/Mobile.vue', 'WebsideMerchantIdentity'],
  ])('is published by the %s footer', (_layout, file, tag) => {
    // Both, not either: a layout that omits it fails the disclosure for
    // every shopper on that layout.
    const tags: string[] = []
    walkElements(sfcTemplate(resolve(COMPONENTS, file)), (node) => {
      tags.push(node.tag)
    })
    expect(tags).toContain(tag)
  })

  it.each([
    ['desktop', 'variants/webside/Footer/Desktop.vue'],
    ['mobile', 'variants/webside/Footer/Mobile.vue'],
  ])('is placed by the webside %s footer under the About column AND in its fallback', (_layout, file) => {
    // Under the column of the About page, and where a footer with no such
    // column keeps it: dropping either leaves some store with no disclosure.
    let count = 0
    walkElements(sfcTemplate(resolve(COMPONENTS, file)), (node) => {
      if (node.tag === 'WebsideMerchantIdentity') count++
    })
    expect(count).toBe(2)
  })

  it('is published by the ekfyseosfyteias chrome footer, which lays it out itself', () => {
    // That footer replaces the default chrome and renders the identity
    // fields from the composable rather than through the component.
    expect(callsIn(resolve(COMPONENTS, 'Chrome/variants/ekfyseosfyteias/Footer.vue'), /^useMerchantIdentity$/)).toHaveLength(1)
  })
})
