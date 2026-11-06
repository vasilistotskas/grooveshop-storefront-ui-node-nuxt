import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideProductCard from '~/components/variants/webside/Product/Card.vue'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The webside card names a product through `extractTranslated`, so
 * a product the store has not translated into the page's language shows
 * the store's language rather than a blank title. Its markup is pinned by
 * `test/nuxt/variants/webside/design-render.spec.ts`.
 */
describe('webside Product/Card', () => {
  beforeEach(() => {
    setTenant({ defaultLocale: 'en', availableLocales: ['el', 'en'] })
  })

  const mountCard = (overrides: Parameters<typeof makeProduct>[0]) => mountSuspended(WebsideProductCard, {
    props: { product: makeProduct(overrides) },
    global: { stubs: { ImgWithFallback: true, ButtonProductAddToCart: true } },
    route: false,
  })

  // EU Omnibus: a percentage on a card is an announced reduction, and an
  // announcement states the prior price Django froze when it began
  // (`shared/utils/productPrice.ts: productAnnouncement`).
  it('states the prior price of the reduction its badge announces', async () => {
    const wrapper = await mountCard({ price: 100, priorPrice: 150, announcedDiscountPercent: 17 })

    expect(wrapper.text()).toContain('-17%')
    expect(wrapper.get('s').text()).toBe(useNuxtApp().$i18n.n(150, 'currency'))
    expect(wrapper.text()).toContain('Χαμηλότερη τιμή 30 ημερών πριν την έκπτωση')
  })

  it('announces nothing, and strikes nothing through, for a markdown with no prior price', async () => {
    const wrapper = await mountCard({ price: 100, discountPercent: 10 })

    expect(wrapper.text()).not.toContain('%')
    expect(wrapper.find('s').exists()).toBe(false)
    expect(wrapper.find('span.line-through').exists()).toBe(false)
  })

  it('names a product the store has not translated into the page\'s language in the store\'s', async () => {
    const product = makeProduct({
      id: 7,
      slug: 'glastra',
      translations: { en: { name: 'Planter', description: '', seoTitle: '', seoDescription: '', seoKeywords: '' } },
    })

    const wrapper = await mountSuspended(WebsideProductCard, {
      props: { product },
      global: { stubs: { ImgWithFallback: true, ButtonProductAddToCart: true } },
      route: false,
    })

    expect(wrapper.get('a h3').text()).toBe('Planter')
  })
})
