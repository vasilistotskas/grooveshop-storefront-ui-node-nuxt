import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SectionHeader from '~/components/PageSection/variants/ekfyseosfyteias/SectionHeader.vue'

/**
 * The header shared by the bands: eyebrow and h2 on one side, the lead
 * and the link on the other. Each part is optional, and a link needs
 * both its text and its destination.
 */
describe('ekfyseosfyteias SectionHeader', () => {
  it('prints the eyebrow, the h2, the lead and the link', async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      route: false,
      props: {
        eyebrow: 'Δράσεις',
        heading: 'Ένας χρόνος στη Φυτειά.',
        lead: 'Δράσεις που οργανώνουμε.',
        ctaText: 'Όλες οι δράσεις',
        ctaLink: '/blog',
      },
    })

    expect(wrapper.find('h2').text()).toBe('Ένας χρόνος στη Φυτειά.')
    expect(wrapper.text()).toContain('Δράσεις που οργανώνουμε.')
    expect(wrapper.text()).toContain('Δράσεις')
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Όλες οι δράσεις', '/blog'])
  })

  it('is just the heading when it has neither lead nor link', async () => {
    const wrapper = await mountSuspended(SectionHeader, { route: false, props: { heading: 'Μόνο τίτλος' } })

    expect(wrapper.find('h2').text()).toBe('Μόνο τίτλος')
    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('draws no link for a text without a destination', async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      route: false,
      props: { heading: 'Τίτλος', ctaText: 'Όλα' },
    })

    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('renders nothing when empty', async () => {
    const wrapper = await mountSuspended(SectionHeader, { route: false, props: {} })

    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.find('div').exists()).toBe(false)
  })
})
