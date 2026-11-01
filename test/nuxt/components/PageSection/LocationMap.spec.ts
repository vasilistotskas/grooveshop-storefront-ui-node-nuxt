import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LocationMap from '~/components/PageSection/LocationMap.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The location map band draws the store's own location
 * (`STORE_GEO_LAT`/`STORE_GEO_LNG`), the one its structured data
 * reports. It used to carry coordinates of its own, and they drifted: a
 * store's map showed the owner's pin while the location it gave search
 * engines was about 750 m away.
 *
 * Coordinates are also the path an operator can actually take: the
 * embed needs the provider's origin added to the tenant's
 * `allowed_csp_sources`, while the platform maps host is already in
 * every tenant's `connect-src`.
 *
 * The canvas itself is replaced — it is `.client`-only and pulls in
 * MapLibre. It renders as `LazyPageSectionLocationCanvas` inside
 * `<ClientOnly>`, and a `global.stubs` entry keyed by that `Lazy*` name
 * never matches. So the MODULE the lazy wrapper imports is mocked: the
 * wrapper still resolves asynchronously (hence the `vi.waitFor`), but
 * to this stub, with no cold MapLibre transform to wait for under a
 * loaded parallel run. What is under test is which of the three shapes
 * the section chooses.
 */
vi.mock('~/components/PageSection/LocationCanvas.client.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { lat: Number, lng: Number, address: String },
      setup: props => () => h('div', { 'data-test': 'canvas', 'data-lat': props.lat, 'data-lng': props.lng }),
    }),
  }
})

const { settings } = vi.hoisted(() => ({ settings: {} as Record<string, string> }))
mockNuxtImport('useSettingValue', () => (key: string) => computed(() => settings[key] ?? ''))

/** The store's location, as its settings hold it: decimal degrees, as text. */
function storeAt(lat: string, lng: string) {
  settings.STORE_GEO_LAT = lat
  settings.STORE_GEO_LNG = lng
}

const mountMap = (props: Record<string, unknown> = {}) =>
  mountSuspended(LocationMap, { route: false, props })

/** The canvas loads on the visitor's request, so a test that wants it asks. */
const mountOpenMap = async (props: Record<string, unknown> = {}) => {
  const wrapper = await mountMap(props)
  await wrapper.find('button').trigger('click')
  return wrapper
}

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { title: 'Τοποθεσία καταστήματος', show_map: 'Εμφάνιση χάρτη' }

describe('the location map band', () => {
  // The canvas additionally requires the platform maps host
  // (`mapsTileJsonUrl`), empty in the test env. The runtime config is
  // the shared Nuxt app's, so it is put back after every test.
  let originalUrl: unknown
  beforeEach(() => {
    storeAt('', '')
    originalUrl = useRuntimeConfig().public.mapsTileJsonUrl
    useRuntimeConfig().public.mapsTileJsonUrl = 'https://maps.platform.test/basemap.json'
  })
  afterEach(() => {
    useRuntimeConfig().public.mapsTileJsonUrl = originalUrl as string
  })

  it('offers the map instead of loading it, until the visitor asks', async () => {
    storeAt('40.6403', '22.9439')
    const wrapper = await mountMap()

    expect(wrapper.find('button').text()).toBe(COPY.show_map)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)

    await wrapper.find('button').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true))
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('pins the store\'s own location on the canvas', async () => {
    storeAt('40.565129', '22.119096')
    const wrapper = await mountOpenMap()

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true))
    const canvas = wrapper.find('[data-test="canvas"]')
    expect([canvas.attributes('data-lat'), canvas.attributes('data-lng')]).toEqual(['40.565129', '22.119096'])
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('draws the canvas at a zero coordinate — 0 is a place, not a missing value', async () => {
    storeAt('0', '22.9439')
    const wrapper = await mountOpenMap()

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').attributes('data-lat')).toBe('0'))
  })

  it('offers no map for a store without a location', async () => {
    storeAt('', '')

    const wrapper = await mountMap({ address: '12 Main St' })

    expect(wrapper.text()).not.toContain(COPY.show_map)
    expect(wrapper.find('p').text()).toBe('12 Main St')
  })

  it('prefers the operator\'s own embed over the canvas, and names the frame', async () => {
    storeAt('40.6403', '22.9439')
    const wrapper = await mountMap({ embedUrl: 'https://www.google.com/maps/embed?pb=x' })

    const frame = wrapper.find('iframe')
    expect(frame.attributes('src')).toBe('https://www.google.com/maps/embed?pb=x')
    expect(frame.attributes('title')).toBe(COPY.title)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
  })

  it('renders nothing at all with neither a map nor an address', async () => {
    const wrapper = await mountMap()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('hides the canvas when no maps host is configured, and keeps the app links', async () => {
    // There is no other tile source: an unconfigured host must hide the
    // canvas, not render a blank one.
    useRuntimeConfig().public.mapsTileJsonUrl = ''
    storeAt('40.6403', '22.9439')

    const wrapper = await mountMap()

    expect(wrapper.text()).not.toContain(COPY.show_map)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual([
      'https://www.google.com/maps/search/?api=1&query=40.6403%2C22.9439',
      'https://maps.apple.com/place?coordinate=40.6403,22.9439',
    ])
  })

  it('still shows the address line with no maps host and no embed', async () => {
    useRuntimeConfig().public.mapsTileJsonUrl = ''
    storeAt('40.6403', '22.9439')

    const wrapper = await mountMap({ address: '12 Main St' })

    expect(wrapper.find('p').text()).toBe('12 Main St')
  })

  describe('opening the place in a maps app', () => {
    it('links Google Maps and Apple Maps in a new tab, and says so to a screen reader', async () => {
      storeAt('40.565129', '22.119096')
      const wrapper = await mountMap({ address: 'Φυτειά Βέροιας, Ημαθία' })

      const links = wrapper.findAll('a')
      expect(links.map(link => [link.text(), link.attributes('target')])).toEqual([
        ['Google Maps (ανοίγει σε νέα καρτέλα)', '_blank'],
        ['Apple Maps (ανοίγει σε νέα καρτέλα)', '_blank'],
      ])
      expect(links[0]!.attributes('href')).toBe('https://www.google.com/maps/search/?api=1&query=40.565129%2C22.119096')
    })

    it('names the Apple place card after the store', async () => {
      setTenant({ storeName: 'Εκ Φύσεως Φυτειάς' })
      storeAt('40.565129', '22.119096')

      const wrapper = await mountMap()

      expect(wrapper.findAll('a')[1]!.attributes('href'))
        .toBe(`https://maps.apple.com/place?coordinate=40.565129,22.119096&name=${encodeURIComponent('Εκ Φύσεως Φυτειάς')}`)
    })

    it('searches for the address when the store has no location', async () => {
      const wrapper = await mountMap({ address: 'Φυτειά Βέροιας, Ημαθία' })

      expect(wrapper.findAll('a')[0]!.attributes('href'))
        .toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Φυτειά Βέροιας, Ημαθία')}`)
    })
  })
})
