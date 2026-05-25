/**
 * Tests for Order/BoxNowTracking.vue component.
 *
 * Renders a tracking card with voucher number, locker info,
 * BoxNow tracking link, and label download link.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import BoxNowTracking from '~/components/Order/BoxNowTracking.vue'

// ---------------------------------------------------------------------------
// Mock useBoxNowParcelState so tests get predictable presentations
// instead of relying on i18n resolution for the nested StateBadge.
// ---------------------------------------------------------------------------

mockNuxtImport('useBoxNowParcelState', () => () => ({
  presentationFor: (state: string) => ({
    label: `label_${state}`,
    color: state === 'delivered' ? 'success' : state === 'final_destination' ? 'warning' : 'neutral',
    icon: 'i-lucide-package',
  }),
}))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// Fixture uses a subset of BoxNowShipmentDetail fields; cast to satisfy TS
// until the spec is updated to provide the full generated type shape.
function makeShipment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'abc-123',
    parcelState: 'new',
    parcelId: null as string | null,
    locker: null as Record<string, unknown> | null,
    events: [] as unknown[],
    lastEventAt: null as string | null,
    ...overrides,
  } as any
}

const FULL_LOCKER = {
  id: 1,
  externalId: '4',
  name: 'Χαλάνδρι ΟΠΑΠ Play',
  addressLine1: 'Λεωφ. Πεντέλης 125',
  postalCode: '15234',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Order/BoxNowTracking', () => {
  describe('voucher number rendering', () => {
    it('shows the parcel ID (voucher number) when parcelId is set', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: '9219709201' }),
          orderId: 42,
        },
      })

      expect(wrapper.html()).toContain('9219709201')
    })

    it('does NOT show a voucher row when parcelId is null', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: null }),
          orderId: 42,
        },
      })

      // The voucher is in a mono font span — its text won't appear
      expect(wrapper.html()).not.toContain('font-mono')
    })
  })

  describe('locker info rendering', () => {
    it('shows locker name and address when locker is set', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ locker: FULL_LOCKER }),
          orderId: 42,
        },
      })

      expect(wrapper.html()).toContain('Χαλάνδρι ΟΠΑΠ Play')
      expect(wrapper.html()).toContain('Λεωφ. Πεντέλης 125')
      expect(wrapper.html()).toContain('15234')
    })

    it('does NOT show locker info when locker is null', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ locker: null }),
          orderId: 42,
        },
      })

      expect(wrapper.html()).not.toContain('Χαλάνδρι ΟΠΑΠ Play')
    })
  })

  describe('tracking link', () => {
    it('renders the "Open BoxNow tracking" link with the correct href when parcelId is set', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: '9219709201' }),
          orderId: 42,
        },
      })

      const html = wrapper.html()
      // BoxNow's public tracking page is at boxnow.gr/en?track=<parcelId>.
      // The old subdomain (tracking.boxnow.gr/track/<id>) was an
      // internal one that customers couldn't reach.
      expect(html).toContain('https://boxnow.gr/en?track=9219709201')
    })

    it('does NOT render the tracking link when parcelId is null', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: null }),
          orderId: 42,
        },
      })

      expect(wrapper.html()).not.toContain('boxnow.gr/en?track')
    })
  })

  describe('label download link', () => {
    it('renders the "Download label" button with the correct href when parcelId is set', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: '9219709201' }),
          orderId: 42,
        },
      })

      const html = wrapper.html()
      expect(html).toContain('/api/orders/42/boxnow-label')
    })

    it('does NOT render the label download button when parcelId is null', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: null }),
          orderId: 42,
        },
      })

      expect(wrapper.html()).not.toContain('boxnow-label')
    })

    it('uses the correct orderId in the label download URL', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelId: '0000000001' }),
          orderId: 999,
        },
      })

      expect(wrapper.html()).toContain('/api/orders/999/boxnow-label')
    })
  })

  describe('pending_creation state', () => {
    it('renders the tracking card (no crash) when parcelState is pending_creation and no parcelId', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelState: 'pending_creation', parcelId: null }),
          orderId: 42,
        },
      })

      // Should mount without error; no voucher or label links shown
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).not.toContain('boxnow.gr/en?track')
      expect(wrapper.html()).not.toContain('boxnow-label')
    })
  })

  describe('BoxNowStateBadge integration', () => {
    it('renders the OrderBoxNowStateBadge component', async () => {
      const wrapper = await mountSuspended(BoxNowTracking, {
        props: {
          shipment: makeShipment({ parcelState: 'delivered' }),
          orderId: 42,
        },
      })

      const badge = wrapper.findComponent({ name: 'OrderBoxNowStateBadge' })
      expect(badge.exists()).toBe(true)
    })
  })
})
