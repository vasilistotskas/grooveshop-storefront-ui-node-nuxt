import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CheckoutGenericLockerPicker from '~/components/Checkout/GenericLockerPicker.vue'
import WebsideCheckoutGenericLockerPicker from '~/components/variants/webside/Checkout/GenericLockerPicker.vue'
import type { Locker, ShippingCarrier } from '~~/shared/shipping/interfaces'
import { acsLockerKey } from '~~/shared/shipping/providers/acs'
import { LOCKER_LIST_LIMIT } from '~/composables/useLockerPicker'
import { trees } from '~~/test/helpers/trees'

/**
 * The carrier-agnostic locker picker (ACS today). It reads the carrier's
 * whole catalogue through the adapter's `fetchAll`, so a fake carrier is
 * the boundary here, and the browser's Geolocation and Permissions APIs
 * are the other one. The modal teleports to `body`, which is why its
 * content is read from the document.
 */

/**
 * The map is its own client-only component, rendered as
 * `<LazyCheckoutSmartpointMap>` — a direct async import no stub key
 * matches — so its module is mocked to keep MapLibre out of the run. The
 * stub shows what the picker tells the map (where to look, where the
 * shopper is), and its one button stands for the map's "show the list".
 */
vi.mock('~/components/Checkout/SmartpointMap.client.vue', () => ({
  default: {
    props: ['lockers', 'loading', 'focus', 'here'],
    emits: ['showList'],
    template: `<div data-test="map" :data-focus="JSON.stringify(focus ?? null)" :data-here="JSON.stringify(here ?? null)" :data-count="lockers.length">
      <button type="button" data-test="map-show-list" @click="$emit('showList')" />
    </div>`,
  },
}))

const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)
const tp = (key: string, params: Record<string, unknown> = {}) => t(`shipping.locker_picker.${key}`, params)

const DEBOUNCE_MS = 200

function locker(id: string, name: string, place: { city?: string, postalCode?: string, lat?: number, lng?: number, branchCode?: string } = {}): Locker {
  const branchCode = place.branchCode ?? null
  return {
    key: acsLockerKey(id, branchCode),
    id,
    branchCode,
    name,
    addressLine1: 'Φιλελλήνων 4',
    addressLine2: null,
    city: place.city ?? 'Αθήνα',
    postalCode: place.postalCode ?? '10557',
    countryCode: 'GR',
    lat: place.lat ?? 37.97,
    lng: place.lng ?? 23.73,
    workingHours: null,
    maxWeightKg: null,
    raw: {},
  }
}

const SYNTAGMA = locker('GR-1', 'Smartpoint Σύνταγμα', { postalCode: '10557', lat: 37.9755, lng: 23.7348 })
const KOLONAKI = locker('GR-2', 'Smartpoint Κολωνάκι', { city: 'Κολωνάκι', postalCode: '10673', lat: 37.9779, lng: 23.7433 })
const KIFISIA = locker('GR-3', 'Smartpoint Κηφισιά', { city: 'Κηφισιά', postalCode: '14561', lat: 38.0736, lng: 23.8114 })
const THESSALONIKI = locker('GR-4', 'Smartpoint Καμάρα', { city: 'Θεσσαλονίκη', postalCode: '54622', lat: 40.6325, lng: 22.9517 })
const CATALOGUE = [KIFISIA, THESSALONIKI, KOLONAKI, SYNTAGMA]

function fakeCarrier(overrides: Partial<ShippingCarrier> = {}): ShippingCarrier {
  return {
    code: 'acs',
    label: 'ACS Courier',
    usesGenericPicker: true,
    formFieldName: 'acsStationExternalId',
    fetchAll: vi.fn((_country: string, _signal?: AbortSignal) => Promise.resolve(CATALOGUE)),
    applyToFormState: vi.fn(),
    readLockerId: () => null,
    readSelectedLocker: () => null,
    ...overrides,
  }
}

// The browser's location APIs, as the test sets them per case.
const geo = vi.hoisted(() => ({
  permission: 'prompt' as PermissionState,
  getCurrentPosition: null as unknown as ReturnType<typeof vi.fn>,
}))

function answerWith(outcome: { at: { lat: number, lng: number } } | { error: number }): void {
  geo.getCurrentPosition.mockImplementation((ok: PositionCallback, fail: PositionErrorCallback) => {
    if ('at' in outcome) {
      ok({ coords: { latitude: outcome.at.lat, longitude: outcome.at.lng } } as GeolocationPosition)
      return
    }
    fail({ code: outcome.error, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
  })
}

function installLocation(): void {
  geo.getCurrentPosition = vi.fn()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: geo.getCurrentPosition },
  })
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: () => Promise.resolve(Object.assign(new EventTarget(), { state: geo.permission })) },
  })
}

function removeLocation(): void {
  Reflect.deleteProperty(navigator, 'geolocation')
  Reflect.deleteProperty(navigator, 'permissions')
}

const body = () => new DOMWrapper(document.body)
const inBody = (text: string) => document.body.textContent?.includes(text) ?? false
const searchInput = () => body().find(`input[aria-label="${tp('search_label')}"]`)
const locationButton = () => body().findAll('button').find(b => b.attributes('aria-label') === tp('use_location'))
const tab = (label: string) => body().findAll('[role="tab"]').find(item => item.text().includes(label))!
const mapStub = () => body().find('[data-test="map"]')
const rowNames = () => body().findAll('#locker-list li button .font-semibold').map(row => row.text())
const rowButton = (name: string) => body().findAll('#locker-list button').find(b => b.text().includes(name))

describe.each(trees(CheckoutGenericLockerPicker, WebsideCheckoutGenericLockerPicker))('$tree Checkout/GenericLockerPicker', ({ C }) => {
  beforeEach(() => {
    geo.permission = 'prompt'
    installLocation()
  })

  afterEach(() => {
    vi.useRealTimers()
    removeLocation()
  })

  /** Mounted closed, then opened: the catalogue loads on the open transition. */
  async function openPicker(carrier: ShippingCarrier, props: Record<string, unknown> = {}): Promise<VueWrapper> {
    const wrapper = await mountSuspended(C, {
      route: false,
      props: { open: false, carrier, countryCode: 'GR', ...props },
    })
    await wrapper.setProps({ open: true })
    await flushPromises()
    return wrapper
  }

  async function showList(): Promise<void> {
    await tab(tp('tab_list')).trigger('mousedown', { button: 0 })
    await tab(tp('tab_list')).trigger('click')
    await flushPromises()
  }

  async function search(text: string): Promise<void> {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await searchInput().setValue(text)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    vi.useRealTimers()
    await flushPromises()
  }

  it('opens on the map with the search above it, loading the catalogue once for the country', async () => {
    const carrier = fakeCarrier()

    await openPicker(carrier, { countryCode: 'cy' })

    expect(tab(tp('tab_map')).attributes('aria-selected')).toBe('true')
    expect(searchInput().exists()).toBe(true)
    expect(carrier.fetchAll).toHaveBeenCalledTimes(1)
    expect(carrier.fetchAll).toHaveBeenCalledWith('CY', expect.any(AbortSignal))
    await vi.waitFor(() => expect(mapStub().attributes('data-count')).toBe(String(CATALOGUE.length)))
  })

  // The picker is mounted, closed, with the selected-locker card on
  // every shipping step; only an open picker may pay for the catalogue.
  it('loads nothing and asks for no position while it is closed', async () => {
    geo.permission = 'granted'
    const carrier = fakeCarrier()

    await mountSuspended(C, { route: false, props: { open: false, carrier, countryCode: 'GR' } })
    await flushPromises()

    expect(carrier.fetchAll).not.toHaveBeenCalled()
    expect(geo.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('loads the catalogue again after a close cut the first load short', async () => {
    const fetchAll = vi.fn((_country: string, signal?: AbortSignal) => new Promise<Locker[]>((resolve, reject) => {
      if (fetchAll.mock.calls.length > 1) return resolve(CATALOGUE)
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const wrapper = await openPicker(fakeCarrier({ fetchAll }))

    await wrapper.setProps({ open: false })
    await flushPromises()
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(fetchAll).toHaveBeenCalledTimes(2)
  })

  it('finds lockers by what the shopper types, whatever its case and accents', async () => {
    await openPicker(fakeCarrier())
    await showList()

    await search('ΚΟΛΩΝΑΚΙ')
    expect(rowNames()).toEqual([KOLONAKI.name])

    await search('θεσσαλονικη')
    expect(rowNames()).toEqual([THESSALONIKI.name])

    await search('105')
    expect(rowNames()).toEqual([SYNTAGMA.name])
  })

  it('moves the map to the matching lockers', async () => {
    await openPicker(fakeCarrier())
    await vi.waitFor(() => expect(mapStub().exists()).toBe(true))
    expect(JSON.parse(mapStub().attributes('data-focus')!)).toBeNull()

    await search('Κηφισιά')

    expect(JSON.parse(mapStub().attributes('data-focus')!)).toEqual([KIFISIA.lng, KIFISIA.lat, KIFISIA.lng, KIFISIA.lat])
  })

  it('says so when nothing matches', async () => {
    await openPicker(fakeCarrier())
    await showList()

    await search('Πάτρα')

    expect(rowNames()).toEqual([])
    expect(inBody(tp('empty_title'))).toBe(true)
  })

  it('starts from the checkout postcode: the nearest lockers first, and the map around them', async () => {
    await openPicker(fakeCarrier(), { initialPostalCode: '10557' })
    await showList()

    expect(inBody(tp('nearest_to_postcode', { postalCode: '10557' }))).toBe(true)
    expect(rowNames()).toEqual([SYNTAGMA.name, KOLONAKI.name, KIFISIA.name, THESSALONIKI.name])
    const [west, south, east, north] = JSON.parse(mapStub().attributes('data-focus')!) as number[]
    expect(south).toBeCloseTo(SYNTAGMA.lat!, 6)
    expect(north).toBeCloseTo(THESSALONIKI.lat!, 6)
    expect(west).toBeCloseTo(THESSALONIKI.lng!, 6)
    expect(east).toBeCloseTo(KIFISIA.lng!, 6)
    // A postcode is an area, not the shopper: no "you are here" dot.
    expect(JSON.parse(mapStub().attributes('data-here')!)).toBeNull()
  })

  it('asks the shopper to search when it has nothing to start from', async () => {
    await openPicker(fakeCarrier())
    await showList()

    expect(rowNames()).toEqual([])
    expect(inBody(tp('search_prompt_title'))).toBe(true)
  })

  it('says how many it left out when a search matches more than the list shows', async () => {
    const many = Array.from({ length: LOCKER_LIST_LIMIT + 5 }, (_, i) => locker('ATH', `Smartpoint Αθήνα ${i}`, { branchCode: String(i) }))
    await openPicker(fakeCarrier({ fetchAll: vi.fn(() => Promise.resolve(many)) }))
    await showList()

    await search('αθηνα')

    expect(rowNames()).toHaveLength(LOCKER_LIST_LIMIT)
    expect(inBody(tp('results_more', { shown: LOCKER_LIST_LIMIT, total: many.length }))).toBe(true)
  })

  it('hands back the locker the shopper picks and closes, among lockers of one ACS area', async () => {
    const sameArea = [
      locker('ATH', 'Smartpoint Σύνταγμα', { branchCode: '001' }),
      locker('ATH', 'Smartpoint Μοναστηράκι', { branchCode: '002' }),
    ]
    const wrapper = await openPicker(fakeCarrier({ fetchAll: vi.fn(() => Promise.resolve(sameArea)) }))
    await showList()
    await search('smartpoint')

    await rowButton('Smartpoint Μοναστηράκι')!.trigger('click')

    expect(wrapper.emitted('selected')).toEqual([[sameArea[1]]])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('shows the error with a retry that loads the catalogue again', async () => {
    const fetchAll = vi.fn((_country: string, _signal?: AbortSignal) =>
      fetchAll.mock.calls.length === 1 ? Promise.reject(new Error('503')) : Promise.resolve(CATALOGUE))
    await openPicker(fakeCarrier({ fetchAll }))
    expect(inBody(tp('error'))).toBe(true)

    await body().findAll('button').find(b => b.text() === tp('retry'))!.trigger('click')
    await flushPromises()

    expect(fetchAll).toHaveBeenCalledTimes(2)
    expect(inBody(tp('error'))).toBe(false)
  })

  it('drops another country\'s lockers when the new country\'s catalogue fails to load', async () => {
    const fetchAll = vi.fn((country: string, _signal?: AbortSignal) =>
      country === 'GR' ? Promise.resolve(CATALOGUE) : Promise.reject(new Error('503')))
    const wrapper = await openPicker(fakeCarrier({ fetchAll }))
    await wrapper.setProps({ open: false })
    await flushPromises()

    await wrapper.setProps({ countryCode: 'CY' })
    await wrapper.setProps({ open: true })
    await flushPromises()
    await showList()
    await search('smartpoint')

    expect(fetchAll).toHaveBeenLastCalledWith('CY', expect.any(AbortSignal))
    expect(inBody(tp('error'))).toBe(true)
    expect(rowNames()).toEqual([])
    expect(mapStub().attributes('data-count')).toBe('0')
  })

  it('follows a country change while it is open, and an older answer cannot bring the old lockers back', async () => {
    let answerGreece: (rows: Locker[]) => void = () => {}
    const cyprus = [locker('CY-1', 'Smartpoint Λευκωσία', { city: 'Λευκωσία', postalCode: '1010', lat: 35.17, lng: 33.36 })]
    const fetchAll = vi.fn((country: string, _signal?: AbortSignal) =>
      country === 'GR' ? new Promise<Locker[]>((resolve) => { answerGreece = resolve }) : Promise.resolve(cyprus))
    const wrapper = await openPicker(fakeCarrier({ fetchAll }))

    await wrapper.setProps({ countryCode: 'CY' })
    await flushPromises()
    answerGreece(CATALOGUE)
    await flushPromises()
    await showList()
    await search('smartpoint')

    expect(fetchAll).toHaveBeenLastCalledWith('CY', expect.any(AbortSignal))
    expect(rowNames()).toEqual(['Smartpoint Λευκωσία'])
  })

  it('shows the server\'s reason when it refuses the catalogue', async () => {
    const refusal = Object.assign(new Error('429'), { statusCode: 429, data: { detail: 'Δοκιμάστε ξανά σε 30 δευτερόλεπτα.' } })
    await openPicker(fakeCarrier({ fetchAll: vi.fn(() => Promise.reject(refusal)) }))

    expect(inBody('Δοκιμάστε ξανά σε 30 δευτερόλεπτα.')).toBe(true)
  })

  it('explains a carrier with no catalogue', async () => {
    await openPicker(fakeCarrier({ fetchAll: undefined }))

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

  it('switches to the list when the map asks for it', async () => {
    await openPicker(fakeCarrier())
    expect(tab(tp('tab_list')).attributes('aria-selected')).toBe('false')

    await vi.waitFor(() => expect(body().find('[data-test="map-show-list"]').exists()).toBe(true))
    await body().find('[data-test="map-show-list"]').trigger('click')
    await flushPromises()

    expect(tab(tp('tab_list')).attributes('aria-selected')).toBe('true')
  })

  describe('the shopper\'s location', () => {
    const NEAR_KIFISIA = { lat: 38.07, lng: 23.81 }

    it('asks for it only on the shopper\'s click, then shows the nearest lockers around them', async () => {
      answerWith({ at: NEAR_KIFISIA })
      await openPicker(fakeCarrier(), { initialPostalCode: '10557' })
      expect(geo.getCurrentPosition).not.toHaveBeenCalled()

      await locationButton()!.trigger('click')
      await flushPromises()
      await showList()

      expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
      expect(inBody(tp('nearest_to_you'))).toBe(true)
      expect(rowNames()[0]).toBe(KIFISIA.name)
      expect(JSON.parse(mapStub().attributes('data-here')!)).toEqual({ ...NEAR_KIFISIA, kind: 'location' })
    })

    it('centres on its own when the shopper already allowed it', async () => {
      geo.permission = 'granted'
      answerWith({ at: NEAR_KIFISIA })

      await openPicker(fakeCarrier())
      await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1))
      await flushPromises()

      expect(JSON.parse(mapStub().attributes('data-here')!)).toEqual({ ...NEAR_KIFISIA, kind: 'location' })
    })

    it.each([
      ['denied', 1, 'location_denied'],
      ['unavailable', 2, 'location_unavailable'],
      ['timed out', 3, 'location_unavailable'],
    ])('explains a location that was %s and keeps the search working', async (_case, code, message) => {
      answerWith({ error: code })
      await openPicker(fakeCarrier())

      await locationButton()!.trigger('click')
      await flushPromises()

      expect(inBody(tp(message))).toBe(true)
      await showList()
      await search('κολωνακι')
      expect(rowNames()).toEqual([KOLONAKI.name])
    })

    it('offers no location button in a browser without geolocation, and the search still works', async () => {
      removeLocation()
      await openPicker(fakeCarrier())

      expect(locationButton()).toBeUndefined()
      await showList()
      await search('κολωνακι')
      expect(rowNames()).toEqual([KOLONAKI.name])
    })
  })
})
