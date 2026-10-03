import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OrderStatusBadge from '~/components/Order/StatusBadge.vue'

/** An order's status as a pill: Django's translated label on the status's tint. */
describe('Order/StatusBadge', () => {
  it.each([
    ['SHIPPED', 'Απεστάλη', 'secondary'],
    ['DELIVERED', 'Παραδόθηκε', 'success'],
    ['CANCELED', 'Ακυρώθηκε', 'error'],
  ] as const)('shows %s as "%s" on the %s tint', async (status, label, color) => {
    const wrapper = await mountSuspended(OrderStatusBadge, { props: { status, label } })

    const badge = wrapper.findComponent({ name: 'UBadge' })
    expect(badge.text()).toBe(label)
    expect(badge.props('color')).toBe(color)
    expect(badge.props('variant')).toBe('soft')
  })
})
