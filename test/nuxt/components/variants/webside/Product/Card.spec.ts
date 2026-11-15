import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideProductCard from '~/components/variants/webside/Product/Card.vue'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

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
  // buy button it would run under it on a 122px card. The row wraps
  // instead, and the price column keeps its own width (no `min-w-0`), so
  // the price alone decides when the button moves to a line of its own;
  // below a 138px card it always does, the full width of the card.
  it('never runs the price under the buy button: the button takes a line of its own where both do not fit', async () => {
    const wrapper = await mountCard()
    const buy = await vi.waitFor(() => {
      const found = wrapper.find('button[aria-label^="Στο καλάθι"]')
      expect(found.exists()).toBe(true)
      return found
    })

    const row = buy.element.parentElement!
    expect([...row.classList]).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'justify-between']))
    const price = row.firstElementChild!
    expect(price.textContent).toContain('€')
    expect([...price.classList]).toContain('@max-[8.625rem]/card:basis-full')
    expect([...price.classList]).not.toContain('min-w-0')
    expect(buy.classes()).toEqual(expect.arrayContaining(['shrink-0', 'ml-auto', '@max-[8.625rem]/card:w-full']))
  })

  // The board's card: the rating under the name on a desk, none in a
  // phone's narrow card.
  it('quotes the rating under the name, and leaves it out of a phone\'s narrow card', async () => {
    setTenantFeatures({ productReviews: true })
    const wrapper = await mountSuspended(WebsideProductCard, {
      props: { product: makeProduct({ id: 9, reviewAverage: 5, reviewCount: 1 }) },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })

    const rating = wrapper.get('div[role="img"]')
    expect(rating.text()).toContain('2,5 · 1')
    expect(rating.classes()).toContain('@max-3xs/card:hidden')
  })

  // «Μόνο 12 απέμειναν» is 106px at 12px: two lines over the picture's
  // foot on a 122px card. Below 138px it is set at 10px (90px), on one line.
  it('keeps the stock pill on one line on the narrowest card, at the picture\'s foot', async () => {
    const wrapper = await mountSuspended(WebsideProductCard, {
      props: { product: makeProduct({ id: 10, stock: 2, lowStockThreshold: 5 }) },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })

    const pill = wrapper.findAll('span').find(span => span.text() === 'Μόνο 2 απέμειναν')!
    expect(pill.classes()).toEqual(expect.arrayContaining(['rounded-full', '@max-[8.625rem]/card:text-[10px]', '@max-[8.625rem]/card:px-1.5']))
    expect(pill.element.parentElement!.classList).toContain('@max-3xs/card:bottom-1.5')
  })

  it('offers the restock alert beside the price when sold out, sized for a phone\'s narrow card', async () => {
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
    // Its own phone sizing, and the card's: the whole row below a 138px card.
    expect(queries).toEqual(expect.arrayContaining(['@max-3xs/card:px-2', '@max-3xs/card:text-sm', '@max-[8.625rem]/card:w-full']))
    // A 44px target on a phone, here and on the product page.
    expect(restock.classes()).toContain('max-sm:min-h-11')
    expect(wrapper.text()).toContain('Εξαντλήθηκε')
  })

  it('draws no share button and no price caption', async () => {
    const wrapper = await mountCard()

    expect(wrapper.find('button[aria-label="Κοινοποίηση"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Τελική Τιμή')
  })

  // WCAG 2.5.8 and the phone's 44px rule: the heart is a round 44px
  // button, and a 32px one in a phone's narrow card with a 44px hit area
  // from a 6px ::after on every side.
  it('draws the heart as a round 44px button, its hit area 44px when compact', async () => {
    const wrapper = await mountCard()
    const favourite = await vi.waitFor(() => {
      // The heart is the card's one toggle button: its name is the product's
      // (Button/Product/AddToFavourite), its state `aria-pressed`.
      const found = wrapper.findAll('button').find(button => button.attributes('aria-pressed') !== undefined)
      expect(found).toBeDefined()
      return found!
    })

    expect(favourite.classes()).toEqual(expect.arrayContaining(['size-11', 'rounded-full', '@max-3xs/card:size-8', 'after:absolute', 'after:-inset-1.5']))
  })
})
