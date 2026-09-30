import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SmartpointMap from '~/components/Checkout/SmartpointMap.client.vue'
import type { Locker } from '~~/shared/shipping/interfaces'
import { acsLockerKey } from '~~/shared/shipping/providers/acs'

/**
 * A pick in a marker's popup resolves to THAT marker's locker. The popup
 * is Leaflet HTML outside Vue, so the map resolves the click from the
 * button's data attribute — by the locker's `key`: every ACS Smartpoint
 * in an area shares its `id`, and resolving by `id` handed back the
 * area's first locker, which the order was then sent to.
 */
function smartpoint(branchCode: string, name: string): Locker {
  return {
    key: acsLockerKey('ATH', branchCode),
    id: 'ATH',
    branchCode,
    name,
    addressLine1: 'Φιλελλήνων 4',
    addressLine2: null,
    city: 'Αθήνα',
    postalCode: '10557',
    countryCode: 'GR',
    lat: 37.97,
    lng: 23.73,
    workingHours: null,
    maxWeightKg: null,
    raw: {},
  }
}

const FIRST = smartpoint('001', 'Smartpoint Σύνταγμα')
const SECOND = smartpoint('002', 'Smartpoint Μοναστηράκι')

// Leaflet's map needs a laid-out container; the popup wiring does not.
const stubs = { LMap: { template: '<div><slot /></div>' }, LTileLayer: true }

describe('Checkout/SmartpointMap', () => {
  it('picks the locker of the popup that was clicked, among lockers of one area', async () => {
    const wrapper = await mountSuspended(SmartpointMap, {
      route: false,
      props: { lockers: [FIRST, SECOND] },
      global: { stubs },
    })
    // What Leaflet renders into the second marker's popup.
    const popup = document.createElement('div')
    popup.innerHTML = `<button type="button" class="acs-popup-select" data-locker-key='${SECOND.key}'>Επιλογή</button>`
    document.body.append(popup)

    popup.querySelector('button')!.click()

    expect(wrapper.emitted('selected')).toEqual([[SECOND]])
    popup.remove()
  })
})
