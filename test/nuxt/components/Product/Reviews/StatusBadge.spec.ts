import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StatusBadge from '~/components/Product/Reviews/StatusBadge.vue'

describe('Product/Reviews/StatusBadge', () => {
  it.each([
    ['TRUE', 'Δημοσιευμένη'],
    ['NEW', 'Σε έλεγχο'],
    ['FALSE', 'Δεν δημοσιεύτηκε'],
    [undefined, 'Σε έλεγχο'],
  ] as const)('says where a review with status %s stands', async (status, label) => {
    const wrapper = await mountSuspended(StatusBadge, { route: false, props: { status } })

    expect(wrapper.text()).toBe(label)
  })
})
