import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideProductCard from '~/components/variants/webside/Product/Card.vue'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

// The browser shares: the share button is drawn (happy-dom has no Web Share).
mockNuxtImport('useShare', () => () => ({ share: () => Promise.resolve(), isSupported: ref(true) }))

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

/**
 * The card in a phone's two columns (a container narrower than 16rem):
 * picture, name, price and a 44px icon-only buy button, as the approved
 * phone design draws it. happy-dom lays nothing out and evaluates no
 * container query, so the classes that switch it ARE the contract here.
 */
describe('webside Product/Card in a narrow container', () => {
  beforeEach(() => {
    setTenant()
  })

  const mountCard = () => mountSuspended(WebsideProductCard, {
    props: { product: makeProduct({ id: 7, translations: { el: { name: 'Κλιπ καλωδίων', description: '', seoTitle: '', seoDescription: '', seoKeywords: '' } } }) },
    global: { stubs: { ImgWithFallback: true } },
    route: false,
  })

  it('names the buy button after what it adds, its visible label kept short', async () => {
    const wrapper = await mountCard()
    const buy = await vi.waitFor(() => {
      const found = wrapper.findAll('button').find(button => button.attributes('aria-label')?.startsWith('Στο καλάθι'))
      expect(found).toBeDefined()
      return found!
    })

    expect(buy.attributes('aria-label')).toBe('Στο καλάθι: Κλιπ καλωδίων')
    expect(buy.find('[data-slot="label"]').text()).toBe('Στο καλάθι')
    // Icon-only and 44px square in a narrow card, the label kept for screen readers.
    expect(buy.classes()).toEqual(expect.arrayContaining(['@max-3xs:size-11', '@max-3xs:*:data-[slot=label]:sr-only']))
  })

  it('is its own container, and drops the share button and the price caption in a narrow one', async () => {
    const wrapper = await mountCard()

    expect(wrapper.find('.product-card').classes()).toContain('@container')
    const caption = wrapper.findAll('span').find(span => span.text() === 'Τελική Τιμή')!
    expect(caption.classes()).toContain('@max-3xs:hidden')
    expect(wrapper.get('button[aria-label="Κοινοποίηση"]').classes()).toContain('@max-3xs:hidden')
  })

  // WCAG 2.5.8 and the phone's 44px rule: the 32px corner buttons get a
  // 44px hit area from a 6px ::after on every side.
  it('gives its 32px corner buttons a 44px hit area', async () => {
    const wrapper = await mountCard()
    expect(wrapper.get('button[aria-label="Κοινοποίηση"]').classes()).toEqual(expect.arrayContaining(['relative', 'after:absolute', 'after:-inset-1.5']))
    const favourite = await vi.waitFor(() => {
      const found = wrapper.findAll('button').find(button => button.attributes('aria-label') === 'Προσθήκη στα αγαπημένα')
      expect(found).toBeDefined()
      return found!
    })

    expect(favourite.classes()).toEqual(expect.arrayContaining(['relative', 'after:absolute', 'after:-inset-1.5']))
  })
})
