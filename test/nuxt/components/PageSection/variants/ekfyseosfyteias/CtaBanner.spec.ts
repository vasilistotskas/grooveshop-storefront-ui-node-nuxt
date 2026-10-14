import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CtaBanner from '~/components/PageSection/variants/ekfyseosfyteias/CtaBanner.vue'

/**
 * One ask: the question, an optional line, and a link. The operator's
 * `backgroundColor` is not a way to leave the store's colour roles.
 */
const PROPS = {
  heading: 'Θέλετε να συνεργαστούμε σε μια δράση ή εκδήλωση;',
  description: 'Γράψτε μας.',
  buttonText: 'Επικοινωνήστε μαζί μας',
  buttonLink: '/contact',
}

describe('ekfyseosfyteias cta_banner', () => {
  it('asks in an h2 and offers the button as a link', async () => {
    const wrapper = await mountSuspended(CtaBanner, { route: false, props: PROPS })

    expect(wrapper.find('h2').text()).toBe(PROPS.heading)
    expect(wrapper.text()).toContain(PROPS.description)
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([PROPS.buttonText, '/contact'])
  })

  it('opens with its own space above the box, and drops it right after a paper band', async () => {
    const wrapper = await mountSuspended(CtaBanner, { route: false, props: PROPS })

    // The class pair is the contract: a sibling selector on the band's
    // own surface, which happy-dom cannot lay out. On the cellar the box
    // sat flush against the raised gift band above it.
    const band = wrapper.find('section')
    expect(band.classes()).toEqual(expect.arrayContaining([
      'pt-[clamp(64px,8vw,112px)]',
      '[[data-fy-surface=ground]+&]:pt-0',
    ]))
    expect(band.attributes('data-fy-surface')).toBe('ground')
  })

  it('ignores backgroundColor', async () => {
    const wrapper = await mountSuspended(CtaBanner, {
      route: false,
      props: { ...PROPS, backgroundColor: '#ff0000' },
    })

    expect(wrapper.html()).not.toMatch(/ff0000|rgb\(255, ?0, ?0\)/i)
  })

  it('draws no button without both its text and its link', async () => {
    const wrapper = await mountSuspended(CtaBanner, {
      route: false,
      props: { ...PROPS, buttonLink: undefined },
    })

    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('takes the section title when there is no heading', async () => {
    const wrapper = await mountSuspended(CtaBanner, { route: false, props: { title: 'Συνεργασία', buttonText: 'Γράψτε', buttonLink: '/contact' } })

    expect(wrapper.find('h2').text()).toBe('Συνεργασία')
  })

  it('renders nothing when empty', async () => {
    const wrapper = await mountSuspended(CtaBanner, { route: false, props: {} })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
