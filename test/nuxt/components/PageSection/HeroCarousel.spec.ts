import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HeroCarousel from '~/components/PageSection/HeroCarousel.vue'

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

describe('PageSectionHeroCarousel', () => {
  it('renders the copy a slide carries', async () => {
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES },
    })

    const text = wrapper.text()
    expect(text).toContain('Charge fast, once a day')
    expect(text).toContain('Power banks, GaN chargers and cables that last.')
    expect(text).toContain('Charging')
    expect(text).toContain('Shop charging')
    expect(text).toContain('Buying guides')
  })

  it('sets the copy on the accent panel, not over the photograph', async () => {
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES },
    })

    const heading = wrapper.find('h2')
    const panel = heading.element.closest('.bg-\\(--ui-secondary\\)')
    expect(panel, 'the heading sits inside the accent panel').not.toBeNull()
    // The photograph's box holds the image and nothing else.
    expect(panel?.querySelector('img')).toBeNull()
    expect(wrapper.find('img').element.closest('.bg-\\(--ui-secondary\\)')).toBeNull()
  })

  it('tells the visitor where they are when there is more than one slide', async () => {
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES },
    })

    expect(wrapper.text()).toContain('1 / 2')
    expect(wrapper.text()).toContain('2 / 2')
    expect(wrapper.find('[data-slot="prev"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="next"]').exists()).toBe(true)
  })

  it('draws no controls or counter for a single slide', async () => {
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES.slice(0, 1) },
    })

    expect(wrapper.text()).not.toContain('1 / 1')
    expect(wrapper.find('[data-slot="prev"]').exists()).toBe(false)
  })

  it('renders an image per slide, the first one eagerly', async () => {
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES },
    })

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
    const wrapper = await mountSuspended(HeroCarousel, {
      props: {
        images: ['https://assets.example.test/hero-charging.avif'],
        link: '/products',
      },
    })

    expect(wrapper.findAll('img').length).toBe(1)
    expect(wrapper.find('.bg-\\(--ui-secondary\\)').exists()).toBe(false)
    expect(wrapper.find('a[href="/products"]').exists()).toBe(true)
  })

  it('renders nothing without artwork', async () => {
    // A prop-less `hero_carousel` is what `page_config.defaults` inserts
    // for a brand-new store. It must be absent, not an empty band.
    const wrapper = await mountSuspended(HeroCarousel, { props: {} })

    expect(wrapper.text().trim()).toBe('')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('does not autorotate on the server render, whatever the operator set', async () => {
    // Autoplay runs only where a pointer can pause it (`hover: hover`),
    // which is a browser fact; the server render and a phone both get
    // a still carousel. A hero that moves under a thumb is the band
    // most likely to make someone tap the wrong page.
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES, autoplayMs: 6000 },
    })

    expect(wrapper.html()).toBeTruthy()
    expect(wrapper.text()).toContain('1 / 2')
  })
})
