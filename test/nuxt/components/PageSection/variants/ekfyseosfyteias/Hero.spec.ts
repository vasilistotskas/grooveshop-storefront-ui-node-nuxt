import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Hero from '~/components/PageSection/variants/ekfyseosfyteias/Hero.vue'

/**
 * One section type, three presentations, chosen by the props the section
 * already has: artwork and a light theme draw the seal hero, artwork and
 * `theme: dark` the photo with the overlapping card, and no artwork the
 * typographic page hero. What the three share is the contract worth
 * pinning: where the h1 is, that the photo has a real alt, and that the
 * calls to action are links.
 */
const PROPS = {
  eyebrow: 'Κοινωνική Συνεταιριστική Επιχείρηση Γυναικών',
  heading: 'Ό,τι απλόχερα μας χαρίζει η φύση.',
  subheading: 'Έντεκα γυναίκες στη Φυτειά Ημαθίας.',
  imageUrl: 'https://assets.example.test/jars.jpg',
  imageAlt: 'Βάζα με μαρμελάδες',
  ctaText: 'Δείτε το κελάρι μας',
  ctaLink: '/products',
  secondaryCtaText: 'Ποιες είμαστε',
  secondaryCtaLink: '/about',
}

const mountHero = (props: Record<string, unknown> = {}) =>
  mountSuspended(Hero, { route: false, props: { ...PROPS, ...props } })

describe('ekfyseosfyteias hero_banner', () => {
  describe('with artwork and a light theme (the seal hero)', () => {
    it('is the page\'s h1, with the photo\'s own alt text', async () => {
      const wrapper = await mountHero()

      expect(wrapper.findAll('h1').map(h => h.text())).toEqual([PROPS.heading])
      expect(wrapper.find('img').attributes('alt')).toBe(PROPS.imageAlt)
    })

    it('links both calls to action', async () => {
      const wrapper = await mountHero()

      const links = wrapper.findAll('a').map(a => [a.text(), a.attributes('href')])
      expect(links).toEqual([
        [PROPS.ctaText, '/products'],
        [PROPS.secondaryCtaText, '/about'],
      ])
    })

    it('lists the stats as a definition list of label and value pairs', async () => {
      const wrapper = await mountHero({
        stats: [{ value: '2024', label: 'Ίδρυση' }, { value: '540 μ.', label: 'υψόμετρο' }],
      })

      expect(wrapper.findAll('dl > div').map(row => [row.find('dt').text(), row.find('dd').text()])).toEqual([
        ['Ίδρυση', '2024'],
        ['υψόμετρο', '540 μ.'],
      ])
      expect(wrapper.findAll('dl > div > *').every(el => ['DT', 'DD'].includes(el.element.tagName))).toBe(true)
    })

    it('draws no stats row without stats', async () => {
      const wrapper = await mountHero()

      expect(wrapper.find('dl').exists()).toBe(false)
    })

    it('draws the φ as a pseudo-element: no element carries it as a text node', async () => {
      const wrapper = await mountHero()

      // A glyph element would be a text node axe cannot read ("content
      // is too short") and a box under part of the heading and lead.
      expect(wrapper.findAll('span').filter(span => span.text().trim() === 'φ')).toEqual([])
      // The class is the contract: the stylesheet draws the letter on it.
      expect(wrapper.classes()).toContain('hero-glyph')
    })

    it('draws the three berries only when decor asks for orbs', async () => {
      const plain = await mountHero()
      const orbs = await mountHero({ decor: 'orbs' })

      const decorative = (w: typeof plain) => w.findAll('[aria-hidden="true"]').length
      expect(decorative(orbs) - decorative(plain)).toBe(3)
    })

    it('falls back to the heading as the photo\'s alt when none is given', async () => {
      const wrapper = await mountHero({ imageAlt: undefined })

      expect(wrapper.find('img').attributes('alt')).toBe(PROPS.heading)
    })
  })

  describe('with artwork and theme dark (the photo with an overlapping card)', () => {
    it('keeps the text off the photo and in a mid-page h2, not a second h1', async () => {
      const wrapper = await mountHero({ theme: 'dark', secondaryCtaText: undefined, secondaryCtaLink: undefined })

      expect(wrapper.find('h1').exists()).toBe(false)
      expect(wrapper.findAll('h2').map(h => h.text())).toEqual([PROPS.heading])
      expect(wrapper.find('img').attributes('alt')).toBe(PROPS.imageAlt)
      // The photo is a sibling of the card, never its container.
      expect(wrapper.find('h2').element.closest('figure, picture')).toBeNull()
    })

    it('offers the photo in files as wide as the desk it covers, and as the ~800px a phone\'s band shows', async () => {
      // It was `sizes="xs:100vw"` alone: one 320px variant (640 at x2),
      // stretched 2.25x across a 1440px desk.
      const wrapper = await mountHero({ theme: 'dark' })

      const img = wrapper.find('img')
      const widths = (img.attributes('srcset') ?? '').split(',').map(candidate => Number.parseInt(candidate.trim().split(' ')[1] ?? ''))
      expect(Math.max(...widths)).toBeGreaterThanOrEqual(1536)
      expect(img.attributes('sizes')).toMatch(/^\(max-width: 767px\) 800px, /)
    })

    it('pulls the card up by its own padding, so no line of its text sits on the photo edge', async () => {
      const wrapper = await mountHero({ theme: 'dark' })

      // The class pair is the contract: the margin and the padding read
      // one variable, so the photo's edge can only cross the padding.
      const card = wrapper.find('h2').element.parentElement!
      expect(card.className).toContain('-mt-(--card-pad)')
      expect(card.className).toContain('p-(--card-pad)')
    })

    it('offers the first call to action as a text link', async () => {
      const wrapper = await mountHero({ theme: 'dark' })

      const links = wrapper.findAll('a')
      expect(links.map(a => [a.text(), a.attributes('href')])).toEqual([[PROPS.ctaText, '/products']])
    })
  })

  describe('without artwork (the typographic page hero)', () => {
    it('is an h1 on a plain ground, with no photo', async () => {
      const wrapper = await mountHero({ imageUrl: undefined, imageAlt: undefined })

      expect(wrapper.findAll('h1').map(h => h.text())).toEqual([PROPS.heading])
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toContain(PROPS.subheading)
    })

    it('uses the section title when the heading is not set', async () => {
      const wrapper = await mountHero({ imageUrl: undefined, heading: undefined, title: 'Χρηματοδότηση ΕΣΠΑ' })

      expect(wrapper.find('h1').text()).toBe('Χρηματοδότηση ΕΣΠΑ')
    })
  })

  it('renders nothing without copy or artwork', async () => {
    const wrapper = await mountSuspended(Hero, { route: false, props: {} })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
