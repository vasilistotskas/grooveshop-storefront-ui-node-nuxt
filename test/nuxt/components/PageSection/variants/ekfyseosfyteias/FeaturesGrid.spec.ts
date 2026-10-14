import { describe, it, expect } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FeaturesGrid from '~/components/PageSection/variants/ekfyseosfyteias/FeaturesGrid.vue'

/**
 * `decor: framed` draws product label cards (a list, the seal carrying
 * the title's first letter); any other decor draws numbered value cards
 * (an ordered list, the seal carrying α΄ β΄ γ΄ …). The seal is
 * decoration, so it is hidden from assistive technology in both.
 */
const ITEMS = [
  { title: 'Γλυκό πετιμέζι', text: 'Κολοκύθα βρασμένη σε μούστο.' },
  { title: 'Λικέρ', text: 'Σε μικρά μπουκάλια.' },
  { title: 'Άρωμα βουνού' },
]

const seals = (wrapper: VueWrapper) =>
  wrapper.findAll('li [aria-hidden="true"]').map(seal => seal.text())

describe('ekfyseosfyteias features_grid', () => {
  describe('decor framed (product label cards)', () => {
    const mountFramed = (props: Record<string, unknown> = {}) =>
      mountSuspended(FeaturesGrid, { route: false, props: { items: ITEMS, decor: 'framed', ...props } })

    it('is a list of cards, each an h3 with its text', async () => {
      const wrapper = await mountFramed()

      expect(wrapper.find('ul').exists()).toBe(true)
      expect(wrapper.find('ol').exists()).toBe(false)
      expect(wrapper.findAll('h3').map(h => h.text())).toEqual(ITEMS.map(item => item.title))
      expect(wrapper.text()).toContain(ITEMS[0]!.text)
    })

    it('puts the title\'s first letter in the seal, upper-case and without an accent', async () => {
      const wrapper = await mountFramed()

      expect(seals(wrapper)).toEqual(['Γ', 'Λ', 'Α'])
    })

    it('heads the band with the heading, its lead and a link', async () => {
      const wrapper = await mountFramed({
        heading: 'Γεύσεις της Φυτειάς, σε βάζο.',
        body: 'Τα βρίσκετε στον πάγκο μας.',
        ctaText: 'Όλα τα προϊόντα',
        ctaLink: '/products',
      })

      expect(wrapper.find('h2').text()).toBe('Γεύσεις της Φυτειάς, σε βάζο.')
      expect(wrapper.text()).toContain('Τα βρίσκετε στον πάγκο μας.')
      const link = wrapper.find('a')
      expect([link.text(), link.attributes('href')]).toEqual(['Όλα τα προϊόντα', '/products'])
    })

    it('makes a teaser (it links to the full list) a row the keyboard can scroll: a named, focusable region', async () => {
      const wrapper = await mountFramed({ heading: 'Γεύσεις της Φυτειάς, σε βάζο.', ctaText: 'Όλα τα προϊόντα', ctaLink: '/kelari' })

      const row = wrapper.find('[role="region"]')
      expect([row.attributes('aria-label'), row.attributes('tabindex')]).toEqual(['Γεύσεις της Φυτειάς, σε βάζο.', '0'])
      expect(row.find('ul').findAll('li')).toHaveLength(ITEMS.length)
    })

    it('keeps a band without the link (the list itself) a plain grid, with no extra tab stop', async () => {
      const wrapper = await mountFramed({ heading: 'Λικέρ' })

      expect(wrapper.find('[role="region"]').exists()).toBe(false)
      expect(wrapper.find('[tabindex]').exists()).toBe(false)
    })

    it('says it is a paper band, so a call-to-action band after it adds no space of its own', async () => {
      const wrapper = await mountFramed()

      expect(wrapper.find('section').attributes('data-fy-surface')).toBe('ground')
    })

    it('ends the grid with the ink card when there is a prompt', async () => {
      const wrapper = await mountFramed({
        prompt: { title: 'Παραγγελίες', text: 'Τηλεφωνήστε μας.', ctaText: 'Καλέστε', ctaLink: '/contact' },
      })

      const cards = wrapper.findAll('li')
      expect(cards).toHaveLength(ITEMS.length + 1)
      const last = cards.at(-1)!
      expect(last.find('h3').text()).toBe('Παραγγελίες')
      expect(last.find('a').attributes('href')).toBe('/contact')
    })
  })

  describe('any other decor (numbered value cards)', () => {
    it('is an ordered list, the seal carrying the Greek numerals in order', async () => {
      const wrapper = await mountSuspended(FeaturesGrid, {
        route: false,
        props: { items: ITEMS, heading: 'Τι μας ενώνει' },
      })

      expect(wrapper.find('ol').exists()).toBe(true)
      expect(seals(wrapper)).toEqual(['α΄', 'β΄', 'γ΄'])
      expect(wrapper.find('h2').text()).toBe('Τι μας ενώνει')
    })

    it('numbers the twelfth item ιβ΄', async () => {
      const items = Array.from({ length: 12 }, (_, i) => ({ title: `Αξία ${i + 1}` }))
      const wrapper = await mountSuspended(FeaturesGrid, { route: false, props: { items, decor: 'none' } })

      expect(seals(wrapper).slice(-3)).toEqual(['ι΄', 'ια΄', 'ιβ΄'])
    })
  })

  it('uses the section title as the heading when none is set', async () => {
    const wrapper = await mountSuspended(FeaturesGrid, { route: false, props: { items: ITEMS, title: 'Το κελάρι μας' } })

    expect(wrapper.find('h2').text()).toBe('Το κελάρι μας')
  })

  it('renders nothing without items', async () => {
    const wrapper = await mountSuspended(FeaturesGrid, { route: false, props: { items: [], heading: 'Κενό' } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
