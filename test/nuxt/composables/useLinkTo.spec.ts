import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'

/**
 * A store-written link as a link component's `to`: someone else's https page
 * as it is, a store path in the page's language with its query and hash.
 */
async function linkTo(link: string, locale?: string) {
  let to!: string
  await mountSuspended(defineComponent({
    setup() {
      to = useLinkTo()(link)
      return () => h('div')
    },
  }), { route: locale ? `/${locale}` : false })
  return to
}

describe('useLinkTo', () => {
  it('leaves an https link as it is, query and hash included', async () => {
    expect(await linkTo('https://partner.example/offer?ref=1#top')).toBe('https://partner.example/offer?ref=1#top')
  })

  it('gives a store path the page\'s language, and keeps its query and hash', async () => {
    expect(await linkTo('/products?sort=-createdAt#list')).toBe('/products?sort=-createdAt#list')
    expect(await linkTo('/products?sort=-createdAt#list', 'en')).toBe('/en/products?sort=-createdAt#list')
  })
})
