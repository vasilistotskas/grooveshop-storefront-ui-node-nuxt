import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import HeroShowcase from '~/components/PageSection/HeroShowcase.vue'
import { makeResolvedAsset } from '~~/test/fixtures/media'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The hero that sells and searches at once. Every part is a setting or live
 * data, and every part it cannot draw is left out without a hole: no picture,
 * no phone version, a removed product, a store without a catalogue or a cart,
 * a button with no link. The product card and the search field are their own
 * components with their own specs (`Product/Spotlight`, `Search/Input`); here
 * they are stand-ins that show what the hero handed them.
 */
const device = vi.hoisted(() => ({ mobile: { value: false } }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobile }))

const stubs = {
  SearchInput: { template: '<div data-test="search" />' },
  ProductSpotlight: { props: ['product', 'showAddToCart'], template: '<div data-test="spotlight" :data-id="product.id" :data-cart="String(showAddToCart)" />' },
}

const DESK = 'media/shop_a/uploads/builder/desk.jpg'
const PHONE = 'media/shop_a/uploads/builder/phone.jpg'
const desk = (overrides: Parameters<typeof makeResolvedAsset>[0] = {}) =>
  ({ status: 'ok', value: makeResolvedAsset({ path: DESK, width: 2048, height: 689, alt: 'Black Friday', ...overrides }) }) as ResolvedImage
const phone = { status: 'ok', value: makeResolvedAsset({ path: PHONE, width: 1650, height: 689, alt: '' }) } as ResolvedImage
const product = { status: 'ok', value: makeProductCard({ id: 7 }) } as ResolvedRef<ProductCard>

const FULL = {
  eyebrow: 'Νέο',
  heading: 'Μπες στο side',
  headingAccent: 'της Τεχνολογίας',
  subheading: 'Οδηγοί και gadgets.',
  image: desk(),
  mobileImage: phone,
  imageLink: '/offers',
  showSearch: true,
  ctaText: 'Δες το κατάστημα',
  ctaLink: '/products',
  secondaryCtaText: 'Διάβασε τα άρθρα',
  secondaryCtaLink: '/blog',
  product,
}

const mountHero = (props: Record<string, unknown> = {}) =>
  mountSuspended(HeroShowcase, { route: false, props: { ...FULL, ...props }, global: { stubs } })

describe('PageSection/HeroShowcase', () => {
  beforeEach(() => {
    device.mobile.value = false
    setTenant()
    setTenantFeatures({ catalogue: true, cart: true })
  })

  it('draws the heading and its accent line as the one h1 of the page', async () => {
    const wrapper = await mountHero()

    const headings = wrapper.findAll('h1')
    expect(headings).toHaveLength(1)
    expect(headings[0]!.text()).toBe('Μπες στο side της Τεχνολογίας')
    expect(headings[0]!.get('span').text()).toBe('της Τεχνολογίας')
  })

  it('reads in the phone order: copy, picture, search, buttons, product', async () => {
    const wrapper = await mountHero()

    const order = [...wrapper.element.querySelectorAll('h1, img, [data-test="search"], a[href="/products"], [data-test="spotlight"]')]
      .map(element => element.tagName === 'A' ? 'buttons' : element.getAttribute('data-test') ?? element.tagName.toLowerCase())
    expect(order).toEqual(['h1', 'img', 'search', 'buttons', 'spotlight'])
  })

  describe('picture', () => {
    it('reserves the asset\'s own proportions, and links where the block says', async () => {
      const wrapper = await mountHero()

      const img = wrapper.get('img')
      expect(img.attributes('width')).toBe('2048')
      expect(img.attributes('height')).toBe('689')
      expect(img.attributes('alt')).toBe('Black Friday')
      expect(img.element.closest('a')?.getAttribute('href')).toBe('/offers')
    })

    it('is not a link when the block names none', async () => {
      const wrapper = await mountHero({ imageLink: undefined })

      expect(wrapper.get('img').element.closest('a')).toBeNull()
    })

    // A link's name is its content's: a decorative picture (alt="") would leave
    // the link nameless (WCAG 2.4.4, 4.1.2).
    it('names the link of a decorative picture by its description, else the heading', async () => {
      const described = await mountHero({ imageDecorative: true })
      const undescribed = await mountHero({ imageDecorative: true, image: desk({ alt: '' }), mobileImage: undefined })

      expect(described.get('img').attributes('alt')).toBe('')
      expect(described.get('a[href="/offers"]').attributes('aria-label')).toBe('Black Friday')
      expect(undescribed.get('a[href="/offers"]').attributes('aria-label')).toBe('Μπες στο side της Τεχνολογίας')
    })

    it('lets a described picture name its own link', async () => {
      const wrapper = await mountHero()

      expect(wrapper.get('a[href="/offers"]').attributes('aria-label')).toBeUndefined()
      expect(wrapper.get('a[href="/offers"] img').attributes('alt')).toBe('Black Friday')
    })

    it('is no link when nothing could name it: no description and no heading', async () => {
      const wrapper = await mountHero({ heading: undefined, headingAccent: undefined, image: desk({ alt: '' }), mobileImage: undefined })

      expect(wrapper.get('img').element.closest('a')).toBeNull()
    })

    it('shows the phone version on a phone, and the desk picture on a phone that has none', async () => {
      device.mobile.value = true
      const withPhone = await mountHero()
      const withoutPhone = await mountHero({ mobileImage: { status: 'missing' } })

      expect(withPhone.get('img').attributes('src')).toContain('phone.jpg')
      expect(withPhone.get('img').attributes('width')).toBe('1650')
      // The phone picture has no description of its own: the desk one's is used.
      expect(withPhone.get('img').attributes('alt')).toBe('Black Friday')
      expect(withoutPhone.get('img').attributes('src')).toContain('desk.jpg')
    })

    it('names the picture by the heading when it has no description, and by nothing when it is decorative', async () => {
      const named = await mountHero({ image: desk({ alt: '' }) })
      const decorative = await mountHero({ imageDecorative: true })

      expect(named.get('img').attributes('alt')).toBe('Μπες στο side της Τεχνολογίας')
      expect(decorative.get('img').attributes('alt')).toBe('')
    })

    it('loads eagerly at high priority where the hero leads the page, and lazily under a page\'s own content', async () => {
      const leading = await mountHero()
      const Below = defineComponent({
        setup() {
          providePageSectionPlacement('below-content')
          return () => h(HeroShowcase, FULL)
        },
      })
      const below = await mountSuspended(Below, { route: false, global: { stubs } })

      expect(leading.get('img').attributes('loading')).toBe('eager')
      expect(leading.get('img').attributes('fetchpriority')).toBe('high')
      expect(below.get('img').attributes('loading')).toBe('lazy')
      expect(below.get('img').attributes('fetchpriority')).toBeUndefined()
    })

    it.each([{ status: 'missing' }, { status: 'failed' }])('leaves the picture out when it is $status, and keeps the product', async (image) => {
      const wrapper = await mountHero({ image, mobileImage: undefined })

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.find('[data-test="spotlight"]').exists()).toBe(true)
    })
  })

  describe('product', () => {
    it('hands the card the product and the add-to-cart setting', async () => {
      const wrapper = await mountHero({ showAddToCart: false })

      const card = wrapper.get('[data-test="spotlight"]')
      expect(card.attributes('data-id')).toBe('7')
      expect(card.attributes('data-cart')).toBe('false')
    })

    it.each([
      ['removed', { product: { status: 'missing' } }],
      ['unreadable', { product: { status: 'failed' } }],
      ['not chosen', { product: undefined }],
    ])('draws no card when the product is %s', async (_, props) => {
      const wrapper = await mountHero(props)

      expect(wrapper.find('[data-test="spotlight"]').exists()).toBe(false)
      expect(wrapper.find('img').exists()).toBe(true)
    })
  })

  it('offers the search only when the block asks for it', async () => {
    expect((await mountHero()).find('[data-test="search"]').exists()).toBe(true)
    expect((await mountHero({ showSearch: false })).find('[data-test="search"]').exists()).toBe(false)
    expect((await mountHero({ showSearch: undefined })).find('[data-test="search"]').exists()).toBe(false)
  })

  it('draws neither search nor product for a store without a catalogue', async () => {
    setTenantFeatures({ catalogue: false, cart: true })

    const wrapper = await mountHero()

    expect(wrapper.find('[data-test="search"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="spotlight"]').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('draws the main call to action in the accent and the second as its outline', async () => {
    const wrapper = await mountHero()

    // The button's colour and variant are the contract: the store's accent,
    // solid for the main call to action and outlined for the second.
    const buttons = wrapper.findAllComponents({ name: 'UButton' })
      .map(button => ({ to: button.props('to'), label: button.props('label'), color: button.props('color'), variant: button.props('variant'), size: button.props('size') }))
    expect(buttons).toEqual([
      { to: '/products', label: 'Δες το κατάστημα', color: 'secondary', variant: 'solid', size: 'xl' },
      { to: '/blog', label: 'Διάβασε τα άρθρα', color: 'secondary', variant: 'outline', size: 'xl' },
    ])
  })

  it('leaves out a button that has text but no link', async () => {
    const wrapper = await mountHero({ ctaLink: undefined })

    expect(wrapper.text()).not.toContain('Δες το κατάστημα')
    expect(wrapper.find('a[href="/blog"]').exists()).toBe(true)
  })

  // The column classes are the contract here: a hero with nothing for its
  // right column must not hold one open.
  it('is a single column of copy with neither picture nor product', async () => {
    const wrapper = await mountHero({ image: undefined, mobileImage: undefined, product: undefined })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('lg:grid-cols-')
  })

  // The class is the contract: Nuxt UI's `.light` / `.dark` subtree switch,
  // which the stylesheets and the store's theme write each scheme for
  // (`test/unit/shared/theme/schemes.spec.ts`).
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    [undefined, undefined],
  ] as const)('draws the band in the %s colour scheme', async (colorScheme, scheme) => {
    const classes = (await mountHero({ colorScheme })).get('section').classes()

    expect(classes.includes('dark')).toBe(scheme === 'dark')
    expect(classes.includes('light')).toBe(scheme === 'light')
    // `body` paints its text in the page's scheme: a forced band sets its own.
    expect(classes.includes('text-default')).toBe(scheme !== undefined)
  })

  it('draws nothing when it has nothing to show', async () => {
    const wrapper = await mountHero({
      eyebrow: undefined, heading: undefined, headingAccent: undefined, subheading: undefined,
      image: undefined, mobileImage: undefined, showSearch: false,
      ctaText: undefined, secondaryCtaText: undefined, product: undefined,
    })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
