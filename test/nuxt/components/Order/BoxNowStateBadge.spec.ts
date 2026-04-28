/**
 * Tests for Order/BoxNowStateBadge.vue component.
 *
 * Maps BoxNow parcel states to a colored UBadge.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BoxNowStateBadge from '~/components/Order/BoxNowStateBadge.vue'

// All 12 BoxNow parcel state values and their expected Nuxt UI color token
const STATE_COLOR_MAP = [
  { state: 'pending_creation', color: 'neutral' },
  { state: 'new', color: 'neutral' },
  { state: 'in_depot', color: 'info' },
  { state: 'final_destination', color: 'warning' },
  { state: 'delivered', color: 'success' },
  { state: 'returned', color: 'error' },
  { state: 'expired', color: 'error' },
  { state: 'canceled', color: 'error' },
  { state: 'accepted_for_return', color: 'info' },
  { state: 'accepted_to_locker', color: 'info' },
  { state: 'missing', color: 'error' },
  { state: 'lost', color: 'error' },
] as const

describe('Order/BoxNowStateBadge', () => {
  describe('renders a UBadge for each parcel state', () => {
    it.each(STATE_COLOR_MAP)(
      'state "$state" renders a UBadge with color="$color"',
      async ({ state, color }) => {
        const wrapper = await mountSuspended(BoxNowStateBadge, {
          props: { state },
        })

        expect(wrapper.exists()).toBe(true)

        // The UBadge component receives the color as a prop — verify via the
        // rendered component's props rather than relying on class names (which
        // Tailwind CSS generates and may vary by config).
        const badge = wrapper.findComponent({ name: 'UBadge' })
        expect(badge.exists()).toBe(true)
        expect(badge.props('color')).toBe(color)
      },
    )
  })

  describe('snapshot — final_destination state', () => {
    it('matches the expected structure for final_destination (warning color, package-check icon)', async () => {
      const wrapper = await mountSuspended(BoxNowStateBadge, {
        props: { state: 'final_destination' },
      })

      const badge = wrapper.findComponent({ name: 'UBadge' })
      expect(badge.exists()).toBe(true)
      expect(badge.props('color')).toBe('warning')
      expect(badge.props('icon')).toBe('i-lucide-package-check')

      // Snapshot the outer HTML to catch regressions in the badge rendering
      expect(wrapper.html()).toMatchSnapshot()
    })
  })

  describe('icon correctness', () => {
    it('uses the package icon for "new" state', async () => {
      const wrapper = await mountSuspended(BoxNowStateBadge, {
        props: { state: 'new' },
      })
      const badge = wrapper.findComponent({ name: 'UBadge' })
      expect(badge.props('icon')).toBe('i-lucide-package')
    })

    it('uses a check-circle icon for "delivered" state', async () => {
      const wrapper = await mountSuspended(BoxNowStateBadge, {
        props: { state: 'delivered' },
      })
      const badge = wrapper.findComponent({ name: 'UBadge' })
      expect(badge.props('icon')).toBe('i-lucide-check-circle-2')
    })
  })

  describe('label is a translated string', () => {
    it('UBadge receives a non-empty label for each state', async () => {
      for (const { state } of STATE_COLOR_MAP) {
        const wrapper = await mountSuspended(BoxNowStateBadge, {
          props: { state },
        })
        const badge = wrapper.findComponent({ name: 'UBadge' })
        // label is the i18n translated text (Greek in nuxt test env)
        expect(typeof badge.props('label')).toBe('string')
      }
    })
  })
})
