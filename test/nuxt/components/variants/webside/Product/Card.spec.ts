import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideProductCard from '~/components/variants/webside/Product/Card.vue'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

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
    expect(buy.classes()).toEqual(expect.arrayContaining(['@max-3xs/card:size-11', '@max-3xs/card:*:data-[slot=label]:sr-only']))
  })

  // A desktop listing beside its filters has cards ~170px wide too: being
  // narrow is not enough. The card is the container named `card` below
  // `sm` only, and every compact class asks THAT container, at one of its
  // two widths (the compact card, and the narrowest one below 138px), so
  // from `sm` up no query matches and the card is the full one, in every
  // list.
  it('is compact only as a phone\'s narrow card: every compact class asks the card container, which exists below sm only', async () => {
    const wrapper = await mountCard()
    await vi.waitFor(() => expect(wrapper.find('button[aria-label^="Στο καλάθι"]').exists()).toBe(true))

    const root = wrapper.find('.product-card').classes()
    expect(root).toContain('max-sm:@container/card')
    expect(root.filter(name => /^@container/.test(name))).toEqual([])
    const queries = wrapper.findAll('*').flatMap(node => node.classes()).filter(name => name.startsWith('@max-') || name.startsWith('@min-'))
    expect(queries.length).toBeGreaterThan(10)
    expect(queries.filter(name => !/^@max-(?:3xs|\[8\.625rem\])\/card:/.test(name))).toEqual([])
  })

  // The price is one unbreakable word («783,66 €»): squeezed beside the
  // buy button it ran under it on a 122px card. The row wraps instead, the
  // price column keeps its width (no `min-w-0`) from a zero basis, so the
  // price alone decides when the button moves to a line of its own; below
  // a 138px card it always does, the full width of the card.
  it('never runs the price under the buy button: the button takes a line of its own where both do not fit', async () => {
    const wrapper = await mountCard()
    const buy = await vi.waitFor(() => {
      const found = wrapper.find('button[aria-label^="Στο καλάθι"]')
      expect(found.exists()).toBe(true)
      return found
    })

    const row = buy.element.parentElement!
    expect([...row.classList]).toEqual(expect.arrayContaining(['@max-3xs/card:flex-row', '@max-3xs/card:flex-wrap']))
    const price = row.firstElementChild!
    expect(price.textContent).toContain('€')
    expect([...price.classList]).toEqual(expect.arrayContaining(['@max-3xs/card:basis-0', '@max-3xs/card:grow', '@max-[8.625rem]/card:basis-full']))
    expect([...price.classList]).not.toContain('min-w-0')
    expect(buy.classes()).toEqual(expect.arrayContaining(['@max-3xs/card:shrink-0', '@max-3xs/card:ml-auto', '@max-[8.625rem]/card:w-full']))
  })

  // The stars (78px) and «2,5 · 1» (33px) do not share a 102px row: the
  // figures wrap whole to a second line the 20px row clips, never split.
  it('keeps the rating on one line: figures that do not fit beside the stars are clipped whole', async () => {
    setTenantFeatures({ productReviews: true })
    const wrapper = await mountSuspended(WebsideProductCard, {
      props: { product: makeProduct({ id: 9, reviewAverage: 5, reviewCount: 1 }) },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })

    const rating = wrapper.get('div[role="img"]')
    expect(rating.text()).toContain('2,5 · 1')
    expect(rating.classes()).toEqual(expect.arrayContaining(['h-5', '@max-3xs/card:flex-wrap', '@max-3xs/card:overflow-hidden', '@max-3xs/card:*:min-h-5']))
  })

  // «Μόνο 12 απέμειναν» is 106px at 12px: two lines over the picture's
  // foot on a 122px card. Below 138px it is set at 10px (90px), on one line.
  it('keeps the stock badge on one line on the narrowest card', async () => {
    const wrapper = await mountSuspended(WebsideProductCard, {
      props: { product: makeProduct({ id: 10, stock: 2, lowStockThreshold: 5 }) },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })

    const badge = wrapper.findAll('span').find(span => span.text() === 'Μόνο 2 απέμειναν')!
    expect(badge.classes()).toEqual(expect.arrayContaining(['@max-[8.625rem]/card:text-[10px]', '@max-[8.625rem]/card:px-1.5']))
    expect(badge.element.parentElement!.classList).toContain('@max-3xs/card:inset-x-2')
  })

  it('fits the sold-out card\'s restock button to a phone\'s narrow card only', async () => {
    setTenantFeatures({ productAlerts: true })
    const wrapper = await mountSuspended(WebsideProductCard, {
      props: { product: makeProduct({ id: 8, stock: 0 }) },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })

    const restock = await vi.waitFor(() => {
      const found = wrapper.findAll('button').find(button => button.text() === 'Ειδοποίησέ με όταν γίνει διαθέσιμο')
      expect(found).toBeDefined()
      return found!
    })
    const queries = restock.classes().filter(name => name.startsWith('@'))
    expect(queries).toEqual(['@max-3xs/card:px-2', '@max-3xs/card:text-sm'])
    // A 44px target on a phone, here and on the product page.
    expect(restock.classes()).toContain('max-sm:min-h-11')
  })

  it('drops the share button and the price caption when compact', async () => {
    const wrapper = await mountCard()

    const caption = wrapper.findAll('span').find(span => span.text() === 'Τελική Τιμή')!
    expect(caption.classes()).toContain('@max-3xs/card:hidden')
    expect(wrapper.get('button[aria-label="Κοινοποίηση"]').classes()).toContain('@max-3xs/card:hidden')
  })

  // WCAG 2.5.8 and the phone's 44px rule: the 32px corner buttons get a
  // 44px hit area from a 6px ::after on every side.
  it('gives its 32px corner buttons a 44px hit area', async () => {
    const wrapper = await mountCard()
    expect(wrapper.get('button[aria-label="Κοινοποίηση"]').classes()).toEqual(expect.arrayContaining(['relative', 'after:absolute', 'after:-inset-1.5']))
    const favourite = await vi.waitFor(() => {
      // The heart is the card's one toggle button: its name is the product's
      // (Button/Product/AddToFavourite), its state `aria-pressed`.
      const found = wrapper.findAll('button').find(button => button.attributes('aria-pressed') !== undefined)
      expect(found).toBeDefined()
      return found!
    })

    expect(favourite.classes()).toEqual(expect.arrayContaining(['relative', 'after:absolute', 'after:-inset-1.5']))
  })
})
