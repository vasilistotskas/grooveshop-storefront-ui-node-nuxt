import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SmartpointMap from '~/components/Checkout/SmartpointMap.client.vue'
import type { Locker } from '~~/shared/shipping/interfaces'
import { acsLockerKey } from '~~/shared/shipping/providers/acs'

/**
 * The locker map draws HTML markers over MapLibre's clustered source.
 * MapLibre needs WebGL, which the test DOM has not, so the module is
 * replaced by a stand-in that keeps the parts the component talks to:
 * the map fires `load` and `render`, its source answers
 * `querySourceFeatures` with what the test puts in `features`, and a
 * marker or popup is its element appended to the document.
 */
const sim = vi.hoisted(() => ({
  features: [] as Array<{ geometry: { type: 'Point', coordinates: [number, number] }, properties: Record<string, unknown> }>,
  failWebGl: false,
  options: [] as Array<Record<string, unknown>>,
  expansionZoom: 12,
  easedTo: [] as Array<Record<string, unknown>>,
  appended: [] as HTMLElement[],
}))

vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/_nuxt/maplibre-worker.js' }))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl', () => {
  class GPUInitializationError extends Error {}
  class FakeMap {
    private handlers = new Map<string, Array<(event?: unknown) => void>>()
    private canvas = document.createElement('canvas')
    touchZoomRotate = { disableRotation: () => {} }
    constructor(options: Record<string, unknown>) {
      if (sim.failWebGl) throw new GPUInitializationError('WebGL2 is required')
      sim.options.push(options)
      queueMicrotask(() => {
        this.emit('load')
        this.emit('render')
      })
    }

    on(type: string, handler: (event?: unknown) => void) {
      this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler])
      return this
    }

    once(type: string, handler: (event?: unknown) => void) {
      const wrapped = (event?: unknown) => {
        this.handlers.set(type, (this.handlers.get(type) ?? []).filter(h => h !== wrapped))
        handler(event)
      }
      return this.on(type, wrapped)
    }

    emit(type: string, event?: unknown) {
      for (const handler of this.handlers.get(type) ?? []) handler(event)
    }

    addControl() { return this }
    addSource() { return this }
    addLayer() { return this }
    isSourceLoaded() { return true }
    querySourceFeatures() { return sim.features }
    getSource() {
      return { getClusterExpansionZoom: () => Promise.resolve(sim.expansionZoom), setData: () => {} }
    }

    easeTo(options: Record<string, unknown>) {
      sim.easedTo.push(options)
      this.emit('moveend')
    }

    getCanvas() { return this.canvas }
    setStyle() {}
    remove() {}
  }
  class Marker {
    private element: HTMLElement
    constructor({ element }: { element: HTMLElement }) { this.element = element }
    setLngLat() { return this }
    addTo() {
      document.body.append(this.element)
      sim.appended.push(this.element)
      return this
    }

    remove() { this.element.remove() }
  }
  class Popup {
    private content: HTMLElement | null = null
    setLngLat() { return this }
    setDOMContent(content: HTMLElement) {
      this.content = content
      return this
    }

    addTo() {
      if (this.content) {
        document.body.append(this.content)
        sim.appended.push(this.content)
      }
      return this
    }

    remove() { this.content?.remove() }
  }
  return {
    Map: FakeMap,
    Marker,
    Popup,
    GPUInitializationError,
    NavigationControl: class { readonly control = 'navigation' },
    GeolocateControl: class { readonly control = 'geolocate' },
    setWorkerUrl: () => {},
  }
})

function smartpoint(branchCode: string, name: string, lng = 23.73): Locker {
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
    lng,
    workingHours: null,
    maxWeightKg: null,
    raw: {},
  }
}

// Two lockers of one ACS area: they share the area's `id`.
const FIRST = smartpoint('001', 'Smartpoint Σύνταγμα', 23.73)
const SECOND = smartpoint('002', 'Smartpoint Μοναστηράκι', 23.72)

const asFeature = (locker: Locker) => ({
  geometry: { type: 'Point' as const, coordinates: [locker.lng!, locker.lat!] as [number, number] },
  properties: { key: locker.key },
})

const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)
const body = () => new DOMWrapper(document.body)
const button = (name: string) => body().findAll('button').find(b => (b.attributes('aria-label') ?? b.text()).includes(name))

async function mountMap(lockers: Locker[]) {
  const wrapper = await mountSuspended(SmartpointMap, { route: false, props: { lockers } })
  await vi.waitFor(() => expect(sim.options.length + (sim.failWebGl ? 1 : 0)).toBeGreaterThan(0))
  await flushPromises()
  return wrapper
}

describe('Checkout/SmartpointMap', () => {
  let originalUrl: unknown
  beforeEach(() => {
    originalUrl = useRuntimeConfig().public.mapsTileJsonUrl
    useRuntimeConfig().public.mapsTileJsonUrl = 'https://maps.platform.test/basemap.json'
    Object.assign(sim, { features: [], failWebGl: false, options: [], easedTo: [], appended: [] })
  })
  afterEach(() => {
    useRuntimeConfig().public.mapsTileJsonUrl = originalUrl as string
    for (const element of sim.appended) element.remove()
  })

  it('frames every locker and draws on the platform basemap', async () => {
    await mountMap([FIRST, SECOND])

    const options = sim.options[0]!
    expect(options.bounds).toEqual([23.72, 37.97, 23.73, 37.97])
    expect(options.attributionControl).toEqual({ compact: false })
    const style = options.style as { sources: Record<string, { url: string, attribution: string }> }
    expect(style.sources.protomaps!.url).toBe('https://maps.platform.test/basemap.json')
    expect(style.sources.protomaps!.attribution).toContain('https://www.openstreetmap.org/copyright')
  })

  it('picks the locker whose popup was chosen, among lockers of one area', async () => {
    sim.features = [asFeature(FIRST), asFeature(SECOND)]
    const wrapper = await mountMap([FIRST, SECOND])

    await vi.waitFor(() => expect(button(SECOND.name)).toBeDefined())
    await button(SECOND.name)!.trigger('click')
    const choose = button(t('shipping.locker_picker.choose', { carrier: '' }).trim())
    expect(choose).toBeDefined()
    await choose!.trigger('click')

    expect(wrapper.emitted('selected')).toEqual([[SECOND]])
  })

  it('names a cluster by its count and zooms into it', async () => {
    sim.features = [{
      geometry: { type: 'Point', coordinates: [23.725, 37.97] },
      properties: { cluster: true, cluster_id: 7, point_count: 2 },
    }]
    await mountMap([FIRST, SECOND])

    const label = t('shipping.locker_picker.cluster_aria_label', { count: 2 })
    await vi.waitFor(() => expect(button(label)).toBeDefined())
    await button(label)!.trigger('click')
    await flushPromises()

    expect(sim.easedTo).toEqual([{ center: [23.725, 37.97], zoom: 12 }])
  })

  it('says the map is unavailable without WebGL2, and offers the list', async () => {
    sim.failWebGl = true
    const wrapper = await mountMap([FIRST, SECOND])

    await vi.waitFor(() => expect(wrapper.text()).toContain(t('shipping.locker_picker.map_unavailable')))
    await wrapper.findAll('button').find(b => b.text().includes(t('shipping.locker_picker.show_list')))!.trigger('click')

    expect(wrapper.emitted('showList')).toHaveLength(1)
  })

  it('says the map is unavailable when no maps host is configured', async () => {
    useRuntimeConfig().public.mapsTileJsonUrl = ''
    const wrapper = await mountSuspended(SmartpointMap, { route: false, props: { lockers: [FIRST] } })

    expect(wrapper.text()).toContain(t('shipping.locker_picker.map_unavailable'))
    expect(sim.options).toEqual([])
  })
})
