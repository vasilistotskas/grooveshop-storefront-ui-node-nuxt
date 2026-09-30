import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AcsStateBadge from '~/components/Order/AcsStateBadge.vue'

/**
 * A pass-through for `useAcsShipmentState`'s state → presentation table
 * (which has no spec of its own yet — the composables area owns it).
 * Pins that the badge renders a known state and an unknown one.
 */
describe('Order/AcsStateBadge', () => {
  it('renders the state\'s translated label, icon and colour', async () => {
    const wrapper = await mountSuspended(AcsStateBadge, { props: { state: 'out_for_delivery' }, route: false })

    expect(wrapper.text()).toBe(useNuxtApp().$i18n.t('tracking.acs.state.out_for_delivery'))
    expect(wrapper.find('.i-lucide\\:package-search').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UBadge' }).props('color')).toBe('warning')
  })

  it('renders an unknown Django state as its raw key with the "new" presentation', async () => {
    const wrapper = await mountSuspended(AcsStateBadge, { props: { state: 'held_at_customs' }, route: false })

    expect(wrapper.text()).toBe('held_at_customs')
    expect(wrapper.find('.i-lucide\\:package').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UBadge' }).props('color')).toBe('neutral')
  })
})
