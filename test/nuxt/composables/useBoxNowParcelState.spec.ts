import { describe, it, expect } from 'vitest'
import { useNuxtApp } from '#imports'
import { useBoxNowParcelState } from '~/composables/useBoxNowParcelState'
import type { BoxNowParcelStateValue } from '~/composables/useBoxNowParcelState'

/**
 * Needs the Nuxt environment for `useNuxtApp().$i18n`, whose real
 * messages are loaded here — so a state without a translation shows up
 * as its raw key.
 */

const KNOWN_STATES: BoxNowParcelStateValue[] = [
  'pending_creation',
  'new',
  'in_depot',
  'final_destination',
  'delivered',
  'returned',
  'expired',
  'canceled',
  'accepted_for_return',
  'accepted_to_locker',
  'missing',
  'lost',
]

describe('useBoxNowParcelState', () => {
  it.each(KNOWN_STATES)('labels "%s" with its translation, not the raw state', (state) => {
    const { label } = useBoxNowParcelState().presentationFor(state)

    expect(label).toBe(useNuxtApp().$i18n.t(`tracking.boxnow.state.${state}`))
    expect(label).not.toBe(state)
  })

  it.each<[BoxNowParcelStateValue, string, string]>([
    ['new', 'neutral', 'i-lucide-package'],
    ['in_depot', 'info', 'i-lucide-warehouse'],
    ['final_destination', 'warning', 'i-lucide-package-check'],
    ['delivered', 'success', 'i-lucide-check-circle-2'],
  ])('shows "%s" as a %s chip with %s', (state, color, icon) => {
    expect(useBoxNowParcelState().presentationFor(state)).toMatchObject({ color, icon })
  })

  it.each<BoxNowParcelStateValue>(['returned', 'expired', 'canceled', 'missing', 'lost'])(
    'flags the failed delivery state "%s" as an error',
    (state) => {
      expect(useBoxNowParcelState().presentationFor(state).color).toBe('error')
    },
  )

  // BoxNow has introduced new states before (`in-transit`, `wait-for-load`);
  // the order page must keep rendering.
  it('renders a state it does not know as a neutral help chip labelled with the raw state', () => {
    expect(useBoxNowParcelState().presentationFor('in-transit')).toEqual({
      label: 'in-transit',
      color: 'neutral',
      icon: 'i-lucide-help-circle',
    })
  })
})
