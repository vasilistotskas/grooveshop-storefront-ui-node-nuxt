import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { DOMWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import HeroCarousel from '~/components/PageSection/HeroCarousel.vue'
import { failWith } from '~~/test/helpers/api'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

/** The browser's media-query answers, per query; a missing one is `false`. */
const media = vi.hoisted(() => ({ matches: {} as Record<string, boolean> }))
mockNuxtImport('useMediaQuery', () => (query: string) => ref(media.matches[query] ?? false))

const HOVER = '(hover: hover) and (pointer: fine)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * A hero given `slides` must render them, and must render them as a
 * PANEL beside the artwork rather than copy over it.
 *
 * The first is the regression that put the demo store's homepage on
 * its SECOND band: `page_config.schemas` accepted `slides`, Django
 * stored them and the server proxy passed them through, while the
 * component read only the flat `images` array — no error anywhere,
 * just a missing band.
 *
 * The second is what fixed the phone: with the copy inside the
 * photograph's 16/9 box, a 390px viewport clipped the eyebrow and both
 * CTAs (219px of box for more than 219px of copy, measured on the demo
 * store). The panel has no fixed height, so nothing can be cut off.
 *
 * Artwork is given as an absolute URL rather than the tenant-relative
 * `media/<schema>/...` a real section carries: the mediaStream provider
 * throws without `NUXT_PUBLIC_MEDIA_STREAM_PATH`, which the test
 * environment does not set. What is under test is the slide contract,
 * not URL resolution.
 */
const SLIDES = [
  {
    imageUrl: 'https://assets.example.test/hero-charging.avif',
    alt: 'A charger and a power bank on a desk',
    eyebrow: 'Charging',
    heading: 'Charge fast, once a day',
    subheading: 'Power banks, GaN chargers and cables that last.',
    ctaText: 'Shop charging',
    ctaLink: '/products',
    secondaryCtaText: 'Buying guides',
    secondaryCtaLink: '/blog',
  },
  {
    imageUrl: 'https://assets.example.test/hero-audio.avif',
    heading: 'Earbuds that actually fit',
    ctaText: 'Shop audio',
    ctaLink: '/products',
  },
]

const mountHero = (props: Record<string, unknown>) => mountSuspended(HeroCarousel, { route: false, props })

/** The column of a slide's grid an element sits in. */
const column = (el: DOMWrapper<Element>) => el.element.closest('[data-slot="item"] > div > div')

/** The chips' group (each slide is a `role=group` of its own too). */
const CHIPS = '[role="group"][aria-label="Επιλογή διαφάνειας"]'

/** The carousel's Embla instance — `UCarousel`'s exposed contract. */
const emblaOf = (wrapper: Awaited<ReturnType<typeof mountHero>>) =>
  wrapper.findComponent({ name: 'UCarousel' }).vm.emblaApi

describe('PageSectionHeroCarousel', () => {
  beforeEach(() => {
    media.matches = {}
    clearNuxtData()
  })

  describe('a slide that names a product', () => {
    const powerBank = makeProduct({ id: 7, price: 40, discountPercent: 10, vatPercent: 24, slug: 'power-bank' })

    const withChip = (productId: number) => [{ ...SLIDES[0]!, productId }, SLIDES[1]!]

    it('draws a chip with its name and price, linking to the product', async () => {
      api.routes({ '/api/products/7': powerBank })

      const wrapper = await mountHero({ slides: withChip(7) })

      const chip = wrapper.get('a[href="/products/7/power-bank"]')
      expect(chip.text()).toContain('Προϊόν 7')
      expect(chip.text()).toContain(useNuxtApp().$i18n.n(powerBank.finalPrice, 'currency'))
    })

    it('strikes through what the product cost before its discount', async () => {
      api.routes({ '/api/products/7': powerBank })

      const wrapper = await mountHero({ slides: withChip(7) })

      const was = useNuxtApp().$i18n.n(powerBank.finalPrice + powerBank.discountValue, 'currency')
      expect(wrapper.get('a[href="/products/7/power-bank"] .line-through').text()).toBe(was)
    })

    it('fetches the product of every chip once, together', async () => {
      api.routes({ '/api/products/*': (url: string) => makeProduct({ id: Number(url.split('/').pop()) }) })

      await mountHero({ slides: [{ ...SLIDES[0]!, productId: 7 }, { ...SLIDES[1]!, productId: 9 }, { ...SLIDES[1]!, productId: 7 }] })

      expect(api.callsTo('/api/products/*').map(call => call.url).sort())
        .toEqual(['/api/products/7', '/api/products/9'])
    })

    it('renders the slide without a chip when its product cannot be read', async () => {
      api.routes({ '/api/products/*': failWith(404) })

      const wrapper = await mountHero({ slides: withChip(7) })

      expect(wrapper.find('a[href^="/products/"]').exists()).toBe(false)
      expect(wrapper.find('h1').text()).toBe('Charge fast, once a day')
    })

    it('asks for no product where no slide names one', async () => {
      await mountHero({ slides: SLIDES })

      expect(api.callsTo('/api/products/*')).toEqual([])
    })
  })

  it('renders the copy a slide carries', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    const text = wrapper.text()
    expect(text).toContain('Charge fast, once a day')
    expect(text).toContain('Power banks, GaN chargers and cables that last.')
    expect(text).toContain('Charging')
    expect(text).toContain('Shop charging')
    expect(text).toContain('Buying guides')
  })

  it('makes the first slide\'s heading the page\'s h1 and the later ones h2s', async () => {
    // `heroCarouselHeading` (shared/pageSections.ts) tells the page the
    // same thing, so it stands its own h1 down.
    const wrapper = await mountHero({ slides: SLIDES })

    expect(wrapper.findAll('h1').map(h => h.text())).toEqual(['Charge fast, once a day'])
    expect(wrapper.findAll('h2').map(h => h.text())).toEqual(['Earbuds that actually fit'])
  })

  it('sets the copy in its own panel, not over the photograph', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    const heading = wrapper.find('h1')
    const slide = heading.element.closest('[data-slot="item"]')!
    const headingColumn = column(heading)
    const imageColumn = column(wrapper.find('img'))
    // Two columns of the same slide: the photograph's box holds the
    // image and nothing else, and the panel holds the copy.
    expect(headingColumn).not.toBeNull()
    expect(imageColumn).not.toBeNull()
    expect(headingColumn).not.toBe(imageColumn)
    expect(slide.contains(imageColumn)).toBe(true)
    expect(imageColumn!.querySelector('h1')).toBeNull()
    expect(headingColumn!.querySelector('img')).toBeNull()
  })

  it('tells the visitor where they are when there is more than one slide', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    // Each slide's badge: its eyebrow, then its place in the run.
    const badges = wrapper.findAllComponents({ name: 'UBadge' })
      .map(badge => badge.findAll('span').filter(part => !part.element.children.length).map(part => part.text()))
    expect(badges).toEqual([['Charging', '·', '1 / 2'], ['2 / 2']])
    // Read aloud as words, not as a fraction: the visible counter is
    // hidden from assistive technology and this line says it instead.
    expect(wrapper.findAll('.sr-only').map(el => el.text())).toEqual([
      'Διαφάνεια 1 από 2',
      'Διαφάνεια 2 από 2',
    ])
  })

  it('offers a chip per slide, named after it, and a previous/next pair', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    const chips = wrapper.get(CHIPS).findAll('button')
    // The second slide has no eyebrow, so its chip says its place.
    expect(chips.map(chip => chip.text())).toEqual(['Charging', '2'])
    expect(chips.map(chip => chip.attributes('aria-current'))).toEqual(['true', undefined])
    expect(wrapper.find('button[aria-label="Προηγούμενη διαφάνεια"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Επόμενη διαφάνεια"]').exists()).toBe(true)
  })

  it('moves where the visitor points, and stops autorotating for good', async () => {
    media.matches = { [HOVER]: true }
    const wrapper = await mountHero({ slides: SLIDES, autoplayMs: 6000 })
    // The autoplay plugin loads after the carousel mounts.
    await vi.waitFor(() => expect(emblaOf(wrapper)?.plugins().autoplay).toBeTruthy())
    const embla = emblaOf(wrapper)!
    const scrollTo = vi.spyOn(embla, 'scrollTo')
    const scrollNext = vi.spyOn(embla, 'scrollNext')
    const stop = vi.spyOn(embla.plugins().autoplay!, 'stop')

    await wrapper.get(CHIPS).findAll('button')[1]!.trigger('click')
    await wrapper.get('button[aria-label="Επόμενη διαφάνεια"]').trigger('click')

    expect(scrollTo).toHaveBeenCalledWith(1)
    expect(scrollNext).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('draws no controls or counter for a single slide', async () => {
    const wrapper = await mountHero({ slides: SLIDES.slice(0, 1) })

    expect(wrapper.text()).not.toContain('1 / 1')
    expect(wrapper.find(CHIPS).exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Επόμενη διαφάνεια"]').exists()).toBe(false)
  })

  it('renders an image per slide, the first one eagerly', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    const images = wrapper.findAll('img')
    expect(images.length).toBe(SLIDES.length)
    expect(images[0]!.attributes('loading')).toBe('eager')
    expect(images[0]!.attributes('fetchpriority')).toBe('high')
    expect(images[1]!.attributes('loading')).toBe('lazy')
  })

  it('still renders the flat images form, as the photograph alone', async () => {
    // Layouts written before `slides` existed pass bare URLs and bake
    // their wording into the artwork: no panel, one link over the
    // picture.
    const wrapper = await mountHero({
      images: ['https://assets.example.test/hero-charging.avif'],
      link: '/products',
    })

    expect(wrapper.findAll('img').length).toBe(1)
    expect(wrapper.find('h1, h2').exists()).toBe(false)
    expect(wrapper.find('a[href="/products"]').exists()).toBe(true)
  })

  it('renders nothing without artwork', async () => {
    // A prop-less `hero_carousel` is what `page_config.defaults` inserts
    // for a brand-new store. It must be absent, not an empty band.
    const wrapper = await mountHero({})

    expect(wrapper.text().trim()).toBe('')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  /**
   * Autoplay runs only where a pointer can pause it (`hover: hover`), and
   * never under reduced motion: a hero that moves under a thumb is the
   * band most likely to make someone tap the wrong page. The embla
   * plugin leaves no mark in the DOM, so the carousel's `autoplay` prop
   * is what is asserted.
   */
  it.each<{ name: string, matches: Record<string, boolean>, autoplayMs: number, autoplay: object | false }>([
    { name: 'a pointer that can hover', matches: { [HOVER]: true }, autoplayMs: 6000, autoplay: { delay: 6000, stopOnMouseEnter: true, stopOnInteraction: true } },
    { name: 'a touch screen', matches: {}, autoplayMs: 6000, autoplay: false },
    { name: 'reduced motion', matches: { [HOVER]: true, [REDUCED_MOTION]: true }, autoplayMs: 6000, autoplay: false },
    { name: 'autoplay off', matches: { [HOVER]: true }, autoplayMs: 0, autoplay: false },
  ])('autorotates only where it can be paused: $name', async ({ matches, autoplayMs, autoplay }) => {
    media.matches = matches

    const wrapper = await mountHero({ slides: SLIDES, autoplayMs })

    expect(wrapper.findComponent({ name: 'UCarousel' }).props('autoplay')).toEqual(autoplay)
  })
})
