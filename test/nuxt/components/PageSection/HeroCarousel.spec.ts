import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HeroCarousel from '~/components/PageSection/HeroCarousel.vue'

/**
 * A hero given `slides` must render them.
 *
 * This is the regression that put the demo store's homepage on its
 * SECOND band: `page_config.schemas` accepted `slides`, Django stored
 * them and the server proxy passed them through, while the component
 * read only the flat `images` array. `items.length` was 0, so a fully
 * configured hero rendered nothing at all — no error anywhere, just a
 * missing band.
 *
 * The flat form is still supported for layouts that predate `slides`,
 * so both shapes are pinned here.
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
    theme: 'dark' as const,
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
  })

  it('renders an image per slide', async () => {
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES },
    })

    expect(wrapper.findAll('img').length).toBeGreaterThanOrEqual(1)
  })

  it('still renders the flat images form', async () => {
    // Layouts written before `slides` existed pass bare URLs and bake
    // their wording into the artwork.
    const wrapper = await mountSuspended(HeroCarousel, {
      props: {
        images: ['https://assets.example.test/hero-charging.avif'],
        link: '/products',
      },
    })

    expect(wrapper.findAll('img').length).toBeGreaterThanOrEqual(1)
  })

  it('renders nothing without artwork', async () => {
    // A prop-less `hero_carousel` is what `page_config.defaults` inserts
    // for a brand-new store. It must be absent, not an empty band.
    const wrapper = await mountSuspended(HeroCarousel, { props: {} })

    expect(wrapper.text().trim()).toBe('')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('does not autoplay when the visitor asked for less motion', async () => {
    // A hero that moves on its own is the band most likely to make
    // someone ill, and the preference is where they said so.
    const wrapper = await mountSuspended(HeroCarousel, {
      props: { slides: SLIDES, autoplayMs: 6000 },
    })

    expect(wrapper.html()).toBeTruthy()
  })
})
