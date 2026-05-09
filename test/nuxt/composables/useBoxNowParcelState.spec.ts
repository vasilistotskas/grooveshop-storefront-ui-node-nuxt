/**
 * Tests for useBoxNowParcelState composable.
 *
 * This composable calls useNuxtApp().$i18n.t() so it requires the Nuxt
 * test environment. Placed in test/nuxt/ (not test/unit/) for that reason.
 *
 * Real i18n in the nuxt test environment returns Greek translations.
 * Per project convention, translated labels are asserted with expect.any(String)
 * rather than the raw i18n key or the Greek text (which is fragile to copy).
 */

import { describe, it, expect } from 'vitest'

// All 12 BoxNow parcel state values as defined in useBoxNowParcelState.ts
const ALL_STATES = [
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
] as const

type BoxNowParcelStateValue = (typeof ALL_STATES)[number]

describe('useBoxNowParcelState', () => {
  describe('presentationFor — individual states', () => {
    it('returns the correct shape for "new" state', () => {
      const { presentationFor } = useBoxNowParcelState()
      const result = presentationFor('new')

      expect(result).toMatchObject({
        label: expect.any(String),
        color: 'neutral',
        icon: 'i-lucide-package',
      })
    })

    it('returns color=warning and package-check icon for "final_destination"', () => {
      const { presentationFor } = useBoxNowParcelState()
      const result = presentationFor('final_destination')

      expect(result).toMatchObject({
        label: expect.any(String),
        color: 'warning',
        icon: 'i-lucide-package-check',
      })
    })

    it('returns color=success for "delivered"', () => {
      const { presentationFor } = useBoxNowParcelState()
      const result = presentationFor('delivered')

      expect(result.color).toBe('success')
    })

    it('returns color=error for "returned"', () => {
      const { presentationFor } = useBoxNowParcelState()
      const result = presentationFor('returned')

      expect(result.color).toBe('error')
    })

    it('returns color=error for "expired"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('expired').color).toBe('error')
    })

    it('returns color=error for "canceled"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('canceled').color).toBe('error')
    })

    it('returns color=error for "missing"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('missing').color).toBe('error')
    })

    it('returns color=error for "lost"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('lost').color).toBe('error')
    })

    it('returns color=neutral for "pending_creation"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('pending_creation').color).toBe('neutral')
    })

    it('returns color=info for "in_depot"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('in_depot').color).toBe('info')
    })

    it('returns color=info for "accepted_for_return"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('accepted_for_return').color).toBe('info')
    })

    it('returns color=info for "accepted_to_locker"', () => {
      const { presentationFor } = useBoxNowParcelState()
      expect(presentationFor('accepted_to_locker').color).toBe('info')
    })
  })

  describe('presentationFor — all 12 states have a presentation', () => {
    it.each(ALL_STATES)('returns a valid presentation for state "%s"', (state: BoxNowParcelStateValue) => {
      const { presentationFor } = useBoxNowParcelState()
      const result = presentationFor(state)

      // label comes from real i18n (returns Greek text or key fallback) — just assert string
      expect(result.label).toEqual(expect.any(String))
      // color must be one of the valid Nuxt UI semantic color tokens
      expect(['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']).toContain(result.color)
      // icon must be a non-empty Iconify name
      expect(result.icon).toMatch(/^i-lucide-/)
    })
  })

  describe('presentationFor — return object shape', () => {
    it('always returns an object with exactly label, color, and icon keys', () => {
      const { presentationFor } = useBoxNowParcelState()

      for (const state of ALL_STATES) {
        const result = presentationFor(state)
        expect(Object.keys(result).sort()).toEqual(['color', 'icon', 'label'])
      }
    })
  })
})
