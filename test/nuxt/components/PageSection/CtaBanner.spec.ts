import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'

const mountBanner = (props: Record<string, unknown>) => mountSuspended(CtaBanner, { route: false, props })

/**
 * One ask, alone on a band. The operator's own colour overrides the
 * surface, and because a hex says nothing about the text on it, the
 * copy switches to light over a dark colour — `text-white` is that
 * contract, asserted as a class on purpose.
 */
describe('PageSection/CtaBanner', () => {
  it('switches the copy to light over a dark operator colour', async () => {
    const wrapper = await mountBanner({ heading: 'Δωρεάν αποστολή', backgroundColor: '#1F2937' })

    expect(wrapper.find('section').attributes('style')).toContain('background-color: #1F2937')
    expect(wrapper.find('h2').classes()).toContain('text-white')
  })

  it('keeps the page\'s own colours over a light one', async () => {
    const wrapper = await mountBanner({ heading: 'Δωρεάν αποστολή', backgroundColor: '#FFF7ED' })

    expect(wrapper.find('h2').classes()).not.toContain('text-white')
  })

  it('prefers the heading over the section title', async () => {
    const wrapper = await mountBanner({ title: 'Τίτλος', heading: 'Δωρεάν αποστολή' })

    expect(wrapper.find('h2').text()).toBe('Δωρεάν αποστολή')
  })

  it('links the button to the operator\'s target', async () => {
    const wrapper = await mountBanner({ title: 'Τίτλος', buttonText: 'Αγόρασε', buttonLink: '/products' })

    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Αγόρασε', '/products'])
  })

  it.each([
    { name: 'button text without a link', props: { title: 'Τίτλος', buttonText: 'Αγόρασε' } },
    { name: 'a link without button text', props: { title: 'Τίτλος', buttonLink: '/products' } },
  ])('draws no button for $name', async ({ props }) => {
    const wrapper = await mountBanner(props)

    expect(wrapper.find('h2').text()).toBe('Τίτλος')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('renders nothing without a heading, a description or a link', async () => {
    const wrapper = await mountBanner({ buttonText: 'Αγόρασε' })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
