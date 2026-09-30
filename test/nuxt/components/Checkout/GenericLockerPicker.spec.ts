import { afterEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CheckoutGenericLockerPicker from '~/components/Checkout/GenericLockerPicker.vue'
import WebsideCheckoutGenericLockerPicker from '~/components/variants/webside/Checkout/GenericLockerPicker.vue'
import type { Locker, LockerQuery, ShippingCarrier } from '~~/shared/shipping/interfaces'
import { acsLockerKey } from '~~/shared/shipping/providers/acs'
import { trees } from '~~/test/helpers/trees'

/**
 * The carrier-agnostic locker picker (ACS today). It talks to the
 * carrier only through the adapter's `fetchByPostal` / `fetchAll`, so a
 * fake carrier is the boundary here. The modal teleports to `body`,
 * which is why its content is read from the document. The trees differ
 * only in the `en:` block.
 */

/**
 * The Leaflet map is its own client-only component, rendered as
 * `<LazyCheckoutSmartpointMap>` — a direct async import no stub key
 * matches — so its module is mocked to keep Leaflet out of the run.
 */
vi.mock('~/components/Checkout/SmartpointMap.client.vue', () => ({ default: { template: '<div data-test="map" />' } }))

const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)
const tp = (key: string, params: Record<string, unknown> = {}) => t(`shipping.locker_picker.${key}`, params)

const DEBOUNCE_MS = 300

function locker(id: string, name: string, branchCode: string | null = null): Locker {
  return {
    key: acsLockerKey(id, branchCode),
    id,
    branchCode,
    name,
    addressLine1: 'Φιλελλήνων 4',
    addressLine2: null,
    city: 'Αθήνα',
    postalCode: '10557',
    countryCode: 'GR',
    lat: null,
    lng: null,
    workingHours: null,
    raw: {},
  }
}

const ROWS = [locker('GR-1', 'Smartpoint Σύνταγμα'), locker('GR-2', 'Smartpoint Κολωνάκι')]

function fakeCarrier(overrides: Partial<ShippingCarrier> = {}): ShippingCarrier {
  return {
    code: 'acs',
    label: 'ACS Courier',
    usesGenericPicker: true,
    formFieldName: 'acsStationExternalId',
    fetchByPostal: vi.fn((_query: LockerQuery) => Promise.resolve(ROWS)),
    applyToFormState: vi.fn(),
    readLockerId: () => null,
    readSelectedLocker: () => null,
    ...overrides,
  }
}

const body = () => new DOMWrapper(document.body)
const inBody = (text: string) => document.body.textContent?.includes(text) ?? false
const postalInput = () => body().find(`input[placeholder="${tp('postal_placeholder')}"]`)
const rowButton = (name: string) => body().findAll('button').find(b => b.text().includes(name))

describe.each(trees(CheckoutGenericLockerPicker, WebsideCheckoutGenericLockerPicker))('$tree Checkout/GenericLockerPicker', ({ C }) => {
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Mounted closed, then opened — the search runs on the open transition. */
  async function openPicker(carrier: ShippingCarrier, props: Record<string, unknown> = {}): Promise<VueWrapper> {
    const wrapper = await mountSuspended(C, {
      route: false,
      props: { open: false, carrier, initialPostalCode: '10557', initialCity: 'Αθήνα', countryCode: 'GR', ...props },
    })
    await wrapper.setProps({ open: true })
    await flushPromises()
    return wrapper
  }

  it('searches the checkout address as soon as it opens and lists the lockers', async () => {
    const carrier = fakeCarrier()

    await openPicker(carrier)

    expect(carrier.fetchByPostal).toHaveBeenCalledTimes(1)
    expect(carrier.fetchByPostal).toHaveBeenCalledWith(expect.objectContaining({
      postalCode: '10557',
      city: 'Αθήνα',
      country: 'GR',
    }))
    expect(rowButton('Smartpoint Σύνταγμα')).toBeDefined()
    expect(rowButton('Smartpoint Κολωνάκι')).toBeDefined()
  })

  it('hands back the locker the shopper picks and closes', async () => {
    const wrapper = await openPicker(fakeCarrier())

    await rowButton('Smartpoint Κολωνάκι')!.trigger('click')

    expect(wrapper.emitted('selected')).toEqual([[ROWS[1]]])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('searches again, debounced, when the shopper types a postcode', async () => {
    const carrier = fakeCarrier()
    await openPicker(carrier)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await postalInput().setValue('5462')
    await postalInput().setValue('54624')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
    expect(carrier.fetchByPostal).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(carrier.fetchByPostal).toHaveBeenCalledTimes(2)
    expect(carrier.fetchByPostal).toHaveBeenLastCalledWith(expect.objectContaining({ postalCode: '54624' }))
  })

  it('cancels a search still in flight when a newer one starts', async () => {
    const signals: AbortSignal[] = []
    const carrier = fakeCarrier({
      fetchByPostal: vi.fn(({ signal }: LockerQuery) => {
        signals.push(signal!)
        return new Promise<Locker[]>(() => {})
      }),
    })
    await openPicker(carrier)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await postalInput().setValue('54624')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect(signals).toHaveLength(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
  })

  it('does not search a postcode shorter than four digits', async () => {
    const carrier = fakeCarrier()

    await openPicker(carrier, { initialPostalCode: '105', initialCity: '' })

    expect(carrier.fetchByPostal).not.toHaveBeenCalled()
  })

  it('says so when nothing is found', async () => {
    await openPicker(fakeCarrier({ fetchByPostal: vi.fn(() => Promise.resolve([])) }))

    expect(inBody(tp('empty_title'))).toBe(true)
  })

  it('shows an error when the search fails', async () => {
    await openPicker(fakeCarrier({ fetchByPostal: vi.fn(() => Promise.reject(new Error('502'))) }))

    expect(inBody(tp('error'))).toBe(true)
  })

  it('explains a carrier that cannot search by postcode', async () => {
    await openPicker(fakeCarrier({ fetchByPostal: undefined }))

    expect(inBody(tp('unsupported'))).toBe(true)
  })

  it('closes from its close button', async () => {
    const wrapper = await openPicker(fakeCarrier())

    // The component's own `close` label.
    const close = body().findAll('button[aria-label="Κλείσιμο"]')
    expect(close).toHaveLength(1)
    await close[0]!.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('offers the map only for a carrier with a bulk catalogue, loading it once for the country', async () => {
    const listOnly = await openPicker(fakeCarrier())
    expect(inBody(tp('tab_map'))).toBe(false)
    listOnly.unmount()

    const fetchAll = vi.fn((_country: string, _signal?: AbortSignal) => Promise.resolve(ROWS))
    await openPicker(fakeCarrier({ fetchAll }), { countryCode: 'cy' })

    expect(inBody(tp('tab_map'))).toBe(true)
    expect(fetchAll).toHaveBeenCalledTimes(1)
    expect(fetchAll).toHaveBeenCalledWith('CY', expect.any(AbortSignal))
  })

  // The picker is mounted, closed, with the selected-locker card on
  // every shipping step; only an open picker may pay for the catalogue.
  it('loads nothing while it is closed', async () => {
    const fetchAll = vi.fn((_country: string, _signal?: AbortSignal) => Promise.resolve(ROWS))
    const carrier = fakeCarrier({ fetchAll })

    await mountSuspended(C, { route: false, props: { open: false, carrier, countryCode: 'GR' } })
    await flushPromises()

    expect(fetchAll).not.toHaveBeenCalled()
    expect(carrier.fetchByPostal).not.toHaveBeenCalled()
  })

  it('loads the catalogue again after a close cut the first load short', async () => {
    const fetchAll = vi.fn((_country: string, signal?: AbortSignal) => new Promise<Locker[]>((resolve, reject) => {
      if (fetchAll.mock.calls.length > 1) return resolve(ROWS)
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const wrapper = await openPicker(fakeCarrier({ fetchAll }))

    await wrapper.setProps({ open: false })
    await flushPromises()
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(fetchAll).toHaveBeenCalledTimes(2)
  })

  it('keeps showing the newer search as loading when an older one it replaced settles', async () => {
    let finishNewer: (rows: Locker[]) => void = () => {}
    const fetchByPostal = vi.fn((query: LockerQuery) => new Promise<Locker[]>((resolve, reject) => {
      if (fetchByPostal.mock.calls.length === 1) {
        query.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        return
      }
      finishNewer = resolve
    }))
    await openPicker(fakeCarrier({ fetchByPostal }))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await postalInput().setValue('54624')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    await flushPromises()

    // The first search was aborted and settled; the second is in flight.
    expect(fetchByPostal).toHaveBeenCalledTimes(2)
    expect(inBody(tp('empty_title'))).toBe(false)
    finishNewer(ROWS)
    await flushPromises()
    expect(rowButton('Smartpoint Κολωνάκι')).toBeDefined()
  })

  it('lists two lockers of one ACS area as two rows, and hands back the one picked', async () => {
    const sameArea = [locker('ATH', 'Smartpoint Σύνταγμα', '001'), locker('ATH', 'Smartpoint Μοναστηράκι', '002')]
    const wrapper = await openPicker(fakeCarrier({ fetchByPostal: vi.fn(() => Promise.resolve(sameArea)) }))

    await rowButton('Smartpoint Μοναστηράκι')!.trigger('click')

    expect(wrapper.emitted('selected')).toEqual([[sameArea[1]]])
  })
})
