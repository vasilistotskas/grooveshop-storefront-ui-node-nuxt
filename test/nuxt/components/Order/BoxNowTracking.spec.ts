import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BoxNowTracking from '~/components/Order/BoxNowTracking.vue'
import { makeBoxNowLocker, makeBoxNowParcelEvent, makeBoxNowShipment } from '~~/test/fixtures/boxnow'

const t = (key: string) => useNuxtApp().$i18n.t(key)

const mountCard = (shipment = makeBoxNowShipment(), orderId = 42) =>
  mountSuspended(BoxNowTracking, { props: { shipment, orderId }, route: false })

describe('Order/BoxNowTracking', () => {
  it('shows the voucher, a BoxNow tracking link in a new tab and the label download once the parcel has an id', async () => {
    const wrapper = await mountCard(makeBoxNowShipment({ parcelId: '9219709201' }), 999)

    expect(wrapper.text()).toContain(`${t('tracking.boxnow.voucher')}9219709201`)

    // BoxNow's public tracking page is boxnow.gr/en?track=<parcelId>;
    // the old tracking.boxnow.gr subdomain was internal.
    const tracking = wrapper.get('a[href="https://boxnow.gr/en?track=9219709201"]')
    expect(tracking.text()).toBe(t('tracking.boxnow.open_tracking'))
    expect(tracking.attributes('target')).toBe('_blank')
    expect(tracking.attributes('rel')).toBe('noopener noreferrer')

    const label = wrapper.get('a[href="/api/orders/999/boxnow-label"]')
    expect(label.text()).toBe(t('tracking.boxnow.label_download'))
    expect(label.attributes('target')).toBe('_blank')
  })

  it('shows neither voucher nor links before BoxNow assigned a parcel id', async () => {
    const wrapper = await mountCard(makeBoxNowShipment({ parcelState: 'pending_creation', parcelId: null }))

    expect(wrapper.text()).not.toContain(t('tracking.boxnow.voucher'))
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('shows the pickup locker\'s name and address only when there is one', async () => {
    const withLocker = await mountCard(makeBoxNowShipment({ locker: makeBoxNowLocker() }))
    const without = await mountCard(makeBoxNowShipment({ locker: null }))

    expect(withLocker.text()).toContain(t('tracking.boxnow.locker'))
    expect(withLocker.text()).toContain('Χαλάνδρι ΟΠΑΠ Play')
    expect(withLocker.text()).toContain('Λεωφ. Πεντέλης 125, 15234')
    expect(without.text()).not.toContain(t('tracking.boxnow.locker'))
  })

  it('shows when the parcel was last heard of only once there is an event time', async () => {
    const heard = await mountCard(makeBoxNowShipment({ lastEventAt: '2026-01-15T10:30:00Z' }))
    const silent = await mountCard(makeBoxNowShipment({ lastEventAt: null }))

    expect(heard.text()).toContain(t('tracking.boxnow.last_update'))
    expect(heard.find('time[datetime="2026-01-15T10:30:00.000Z"]').exists()).toBe(true)
    expect(silent.text()).not.toContain(t('tracking.boxnow.last_update'))
  })

  it('heads the card with the parcel state and lists its events', async () => {
    const wrapper = await mountCard(makeBoxNowShipment({
      parcelState: 'delivered',
      events: [makeBoxNowParcelEvent({ id: 1, eventType: 'final_destination', displayName: 'Χαλάνδρι' })],
    }))

    expect(wrapper.find('h2').text()).toBe(t('tracking.boxnow.title'))
    expect(wrapper.text()).toContain(t('tracking.boxnow.state.delivered'))
    expect(wrapper.findAll('[data-slot="description"]').map(d => d.text())).toEqual(['Χαλάνδρι'])
    expect(wrapper.text()).not.toContain(t('tracking.boxnow.no_events'))
  })
})
