import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import TermsConsent from '~/components/Checkout/TermsConsent.vue'

/**
 * The checkout's terms consent: a checkbox whose label links to the
 * terms of use and the privacy policy in a new tab (so the cart and the
 * half-filled form stay where they are).
 */
const mountConsent = (props: { modelValue?: boolean, invalid?: boolean } = {}) =>
  mountSuspended(TermsConsent, { route: false, props })

describe('Checkout/TermsConsent', () => {
  it('links the terms of use and the privacy policy, each in a new tab', async () => {
    const wrapper = await mountConsent()

    const links = wrapper.findAll('a').map(link => [link.text(), link.attributes('href'), link.attributes('target')])
    expect(links).toEqual([
      ['όρους χρήσης', '/terms-of-use', '_blank'],
      ['πολιτική απορρήτου', '/privacy-policy', '_blank'],
    ])
  })

  it('reports the tick through v-model', async () => {
    const wrapper = await mountConsent({ modelValue: false })

    await wrapper.get('[role="checkbox"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('shows what is missing, tied to the checkbox, only when asked', async () => {
    const wrapper = await mountConsent({ invalid: true })

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('αποδέξου τους όρους χρήσης')
    expect(wrapper.get('[role="checkbox"]').attributes('aria-describedby')).toBe(alert.attributes('id'))
  })

  it('shows no message while nothing is missing', async () => {
    const wrapper = await mountConsent({ invalid: false })

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
