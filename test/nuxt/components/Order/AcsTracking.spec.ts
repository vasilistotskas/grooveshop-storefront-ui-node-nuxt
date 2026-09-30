import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { AcsShipmentDetail, AcsStation } from '~~/shared/openapi/types.gen'
import AcsTracking from '~/components/Order/AcsTracking.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'

const t = (key: string) => useNuxtApp().$i18n.t(key)

function makeStation(overrides: Partial<AcsStation> = {}): AcsStation {
  return {
    id: 1,
    uuid: fixtureUuid(12, 1),
    externalId: 'ATH',
    branchCode: '12',
    shopKind: 8,
    name: 'ACS Smartpoint Σύνταγμα',
    addressLine1: 'Φιλελλήνων 4',
    city: 'Αθήνα',
    postalCode: '10557',
    countryCode: 'GR',
    lat: null,
    lng: null,
    maxWeightKg: '20.00',
    workingHours: '',
    isActive: true,
    lastSyncedAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

/** A home-delivery shipment with no voucher yet, no station, no events. */
function makeShipment(overrides: Partial<AcsShipmentDetail> = {}): AcsShipmentDetail {
  return {
    id: 1,
    uuid: fixtureUuid(13, 1),
    voucherNo: null,
    shipmentState: 'new',
    shipmentStateDisplay: 'new',
    deliveryKind: 'home_delivery',
    weightGrams: 500,
    itemQuantity: 1,
    chargeType: 2,
    deliveryProducts: '',
    lastEventAt: null,
    lastPolledAt: null,
    deliveryDate: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    stationDestinationExternalId: '',
    stationBranchDestination: '',
    station: null,
    events: [],
    labelUrl: null,
    cancelRequestedAt: null,
    ...overrides,
  }
}

const mountCard = (shipment = makeShipment(), orderId = 42) =>
  mountSuspended(AcsTracking, { props: { shipment, orderId }, route: false })

describe('Order/AcsTracking', () => {
  it('shows the voucher, a path-based ACS tracking link in a new tab and the label download once there is a voucher', async () => {
    const wrapper = await mountCard(makeShipment({ voucherNo: '7209812345' }), 77)

    expect(wrapper.text()).toContain(`${t('tracking.acs.voucher')}7209812345`)

    // The voucher travels in the PATH: the older `?p=` query form did
    // not deep-link into ACS's tracking app.
    const tracking = wrapper.get('a[href="https://webapp.acscourier.net/track-shipment/7209812345"]')
    expect(tracking.text()).toBe(t('tracking.acs.open_tracking'))
    expect(tracking.attributes('target')).toBe('_blank')
    expect(tracking.attributes('rel')).toBe('noopener noreferrer')

    expect(wrapper.get('a[href="/api/orders/77/acs-label"]').text()).toBe(t('tracking.acs.label_download'))
  })

  it('shows neither voucher nor links before ACS issued one', async () => {
    const wrapper = await mountCard(makeShipment({ shipmentState: 'pending_creation', voucherNo: null }))

    expect(wrapper.text()).not.toContain(t('tracking.acs.voucher'))
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('shows the Smartpoint station only on a pickup order', async () => {
    const pickup = await mountCard(makeShipment({ deliveryKind: 'pickup_point', station: makeStation() }))
    const home = await mountCard()

    expect(pickup.text()).toContain(t('tracking.acs.station'))
    expect(pickup.text()).toContain('ACS Smartpoint Σύνταγμα')
    expect(pickup.text()).toContain('Φιλελλήνων 4, 10557')
    expect(home.text()).not.toContain(t('tracking.acs.station'))
  })

  it('shows the last update only once there is an event time', async () => {
    const heard = await mountCard(makeShipment({ lastEventAt: '2026-01-15T10:30:00Z' }))
    const silent = await mountCard()

    expect(heard.text()).toContain(t('tracking.acs.last_update'))
    expect(heard.find('time[datetime="2026-01-15T10:30:00.000Z"]').exists()).toBe(true)
    expect(silent.text()).not.toContain(t('tracking.acs.last_update'))
  })

  it('heads the card with the shipment state and lists the courier\'s checkpoints', async () => {
    const wrapper = await mountCard(makeShipment({
      shipmentState: 'out_for_delivery',
      events: [{
        id: 1,
        eventTime: '2026-01-15T10:30:00Z',
        checkpointAction: 'ΣΕ ΔΙΑΝΟΜΗ',
        checkpointLocation: 'ΑΘΗΝΑ',
        notes: '',
        receivedAt: FIXTURE_TIMESTAMP,
      }],
    }))

    expect(wrapper.find('h2').text()).toBe(t('tracking.acs.title'))
    expect(wrapper.text()).toContain(t('tracking.acs.state.out_for_delivery'))
    expect(wrapper.findAll('[data-slot="title"]').map(title => title.text())).toEqual(['ΣΕ ΔΙΑΝΟΜΗ'])
  })
})
