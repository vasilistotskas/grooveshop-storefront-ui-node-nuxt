import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'

const mountBanner = (props: Record<string, unknown>) => mountSuspended(CtaBanner, { route: false, props })

/**
 * One ask, alone on a band. The operator's own colour overrides the
 * surface, and because a hex says nothing about the text on it, the
 * copy takes whichever colour clears AA on it. It is set on the band
 * and inherited, never a mode-dependent class: the page's own text
 * colours flip in dark mode and the operator's hex does not.
 */
describe('PageSection/CtaBanner', () => {
  it('switches the copy to light over a dark operator colour', async () => {
    const wrapper = await mountBanner({ heading: 'Δωρεάν αποστολή', backgroundColor: '#1F2937' })

    expect(wrapper.find('section').attributes('style')).toContain('background-color: #1F2937')
    expect(wrapper.find('section').attributes('style')).toContain('color: #ffffff')
    expect(wrapper.find('h2').classes()).not.toContain('text-highlighted')
  })

  it('switches the copy to dark over a light one, in both colour modes', async () => {
    const wrapper = await mountBanner({ heading: 'Δωρεάν αποστολή', backgroundColor: '#FFF7ED' })

    // Explicit near-black, so dark mode cannot put its white headings on it.
    expect(wrapper.find('section').attributes('style')).toContain('color: #171717')
    expect(wrapper.find('h2').classes()).not.toContain('text-highlighted')
  })

  it('keeps AA over a mid-tone, where neither white nor the ink does', async () => {
    // Terracotta: white 4.17:1, #171717 4.30:1, black 5.04:1.
    const wrapper = await mountBanner({ heading: 'Δωρεάν αποστολή', backgroundColor: '#b3694b' })

    expect(wrapper.find('section').attributes('style')).toContain('color: #000000')
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
