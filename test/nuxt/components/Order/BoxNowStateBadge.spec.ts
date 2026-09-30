import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BoxNowStateBadge from '~/components/Order/BoxNowStateBadge.vue'

/**
 * A pass-through: the state → colour/icon/label table is
 * `useBoxNowParcelState`'s, tested in
 * test/nuxt/composables/useBoxNowParcelState.spec.ts. This pins only
 * that the badge renders what the composable says, for a known state
 * and for one BoxNow added after the table was written.
 */
describe('Order/BoxNowStateBadge', () => {
  it('renders the state\'s translated label, icon and colour', async () => {
    const wrapper = await mountSuspended(BoxNowStateBadge, {
      props: { state: 'final_destination' },
      route: false,
    })

    expect(wrapper.text()).toBe(useNuxtApp().$i18n.t('tracking.boxnow.state.final_destination'))
    expect(wrapper.find('.i-lucide\\:package-check').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UBadge' }).props('color')).toBe('warning')
  })

  it('renders an unknown upstream state as its raw key on the neutral help chip', async () => {
    const wrapper = await mountSuspended(BoxNowStateBadge, {
      props: { state: 'wait-for-load' },
      route: false,
    })

    expect(wrapper.text()).toBe('wait-for-load')
    expect(wrapper.find('.i-lucide\\:help-circle').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UBadge' }).props('color')).toBe('neutral')
  })
})
