import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { DOMWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import HeroCarousel from '~/components/PageSection/HeroCarousel.vue'

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
const column = (el: DOMWrapper<Element>) => el.element.closest('section > div')

describe('PageSectionHeroCarousel', () => {
  beforeEach(() => {
    media.matches = {}
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

  it('sets the copy in its own panel, not over the photograph', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    const slide = wrapper.find('h2').element.closest('section')!
    const headingColumn = column(wrapper.find('h2'))
    const imageColumn = column(wrapper.find('img'))
    // Two columns of the same slide: the photograph's box holds the
    // image and nothing else, and the panel holds the copy.
    expect(headingColumn).not.toBeNull()
    expect(imageColumn).not.toBeNull()
    expect(headingColumn).not.toBe(imageColumn)
    expect(slide.contains(imageColumn)).toBe(true)
    expect(imageColumn!.querySelector('h2')).toBeNull()
    expect(headingColumn!.querySelector('img')).toBeNull()
  })

  it('tells the visitor where they are when there is more than one slide', async () => {
    const wrapper = await mountHero({ slides: SLIDES })

    expect(wrapper.text()).toContain('1 / 2')
    expect(wrapper.text()).toContain('2 / 2')
    expect(wrapper.find('[data-slot="prev"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="next"]').exists()).toBe(true)
  })

  it('draws no controls or counter for a single slide', async () => {
    const wrapper = await mountHero({ slides: SLIDES.slice(0, 1) })

    expect(wrapper.text()).not.toContain('1 / 1')
    expect(wrapper.find('[data-slot="prev"]').exists()).toBe(false)
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
    expect(wrapper.find('h2').exists()).toBe(false)
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
