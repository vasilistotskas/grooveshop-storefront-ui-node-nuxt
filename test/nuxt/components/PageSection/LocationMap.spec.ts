import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LocationMap from '~/components/PageSection/LocationMap.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The `location_map` section has accepted `lat`/`lng` since it was
 * written and drew nothing with them: only `embed_url` ever rendered.
 * The demo store seeds coordinates, so its contact page carried a
 * full band — heading padding and all — holding one line of address.
 *
 * Coordinates are also the path an operator can actually take: the
 * embed needs the provider's origin added to the tenant's
 * `allowed_csp_sources`, while the tile origins are already in every
 * tenant's `img-src`.
 *
 * The canvas itself is replaced — it is `.client`-only and pulls in
 * Leaflet. It renders as `LazyPageSectionLocationCanvas` inside
 * `<ClientOnly>`, and a `global.stubs` entry keyed by that `Lazy*` name
 * never matches. So the MODULE the lazy wrapper imports is mocked: the
 * wrapper still resolves asynchronously (hence the `vi.waitFor`), but
 * to this stub, with no cold Leaflet transform to wait for under a
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

const mountMap = (props: Record<string, unknown>) =>
  mountSuspended(LocationMap, { route: false, props })

/** The canvas loads on the visitor's request, so a test that wants it asks. */
const mountOpenMap = async (props: Record<string, unknown>) => {
  const wrapper = await mountMap(props)
  await wrapper.find('button').trigger('click')
  return wrapper
}

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { title: 'Τοποθεσία καταστήματος', show_map: 'Εμφάνιση χάρτη' }

describe('the location map band', () => {
  // The canvas additionally requires the platform's CARTO basemaps key
  // (`shared/utils/carto-basemaps.ts`), empty in the test env. The
  // runtime config is the shared Nuxt app's, so it is put back after
  // every test.
  let originalKey: unknown
  beforeEach(() => {
    originalKey = useRuntimeConfig().public.cartoBasemapsKey
    useRuntimeConfig().public.cartoBasemapsKey = 'test-carto-key'
  })
  afterEach(() => {
    useRuntimeConfig().public.cartoBasemapsKey = originalKey as string
  })

  it('offers the map instead of loading it, until the visitor asks', async () => {
    const wrapper = await mountMap({ lat: 40.6403, lng: 22.9439 })

    expect(wrapper.find('button').text()).toBe(COPY.show_map)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)

    await wrapper.find('button').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true))
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('draws a canvas for coordinates alone', async () => {
    const wrapper = await mountOpenMap({ lat: 40.6403, lng: 22.9439 })

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true))
    const canvas = wrapper.find('[data-test="canvas"]')
    expect([canvas.attributes('data-lat'), canvas.attributes('data-lng')]).toEqual(['40.6403', '22.9439'])
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('draws the canvas at a zero coordinate — 0 is a place, not a missing value', async () => {
    const wrapper = await mountOpenMap({ lat: 0, lng: 22.9439 })

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').attributes('data-lat')).toBe('0'))
  })

  it('prefers the operator\'s own embed over the canvas, and names the frame', async () => {
    const wrapper = await mountMap({
      embedUrl: 'https://www.google.com/maps/embed?pb=x',
      lat: 40.6403,
      lng: 22.9439,
    })

    const frame = wrapper.find('iframe')
    expect(frame.attributes('src')).toBe('https://www.google.com/maps/embed?pb=x')
    expect(frame.attributes('title')).toBe(COPY.title)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
  })

  it('renders nothing at all with neither a map nor an address', async () => {
    const wrapper = await mountMap({})

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('hides the canvas when no CARTO basemaps key is configured, and keeps the app links', async () => {
    // CARTO watermarks a keyless tile request rather than refusing it,
    // so an empty key must hide the canvas, not render a broken one.
    useRuntimeConfig().public.cartoBasemapsKey = ''

    const wrapper = await mountMap({ lat: 40.6403, lng: 22.9439 })

    expect(wrapper.text()).not.toContain(COPY.show_map)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual([
      'https://www.google.com/maps/search/?api=1&query=40.6403%2C22.9439',
      'https://maps.apple.com/place?coordinate=40.6403,22.9439',
    ])
  })

  it('still shows the address line with no key and no embed', async () => {
    useRuntimeConfig().public.cartoBasemapsKey = ''

    const wrapper = await mountMap({ lat: 40.6403, lng: 22.9439, address: '12 Main St' })

    expect(wrapper.find('p').text()).toBe('12 Main St')
  })

  describe('opening the place in a maps app', () => {
    it('links Google Maps and Apple Maps in a new tab, and says so to a screen reader', async () => {
      const wrapper = await mountMap({ lat: 40.56325, lng: 22.10968, address: 'Φυτειά Βέροιας, Ημαθία' })

      const links = wrapper.findAll('a')
      expect(links.map(link => [link.text(), link.attributes('target')])).toEqual([
        ['Google Maps (ανοίγει σε νέα καρτέλα)', '_blank'],
        ['Apple Maps (ανοίγει σε νέα καρτέλα)', '_blank'],
      ])
      expect(links[0]!.attributes('href')).toBe('https://www.google.com/maps/search/?api=1&query=40.56325%2C22.10968')
    })

    it('names the Apple place card after the store', async () => {
      setTenant({ storeName: 'Εκ Φύσεως Φυτειάς' })

      const wrapper = await mountMap({ lat: 40.56325, lng: 22.10968 })

      expect(wrapper.findAll('a')[1]!.attributes('href'))
        .toBe(`https://maps.apple.com/place?coordinate=40.56325,22.10968&name=${encodeURIComponent('Εκ Φύσεως Φυτειάς')}`)
    })

    it('searches for the address when the band has only that', async () => {
      const wrapper = await mountMap({ address: 'Φυτειά Βέροιας, Ημαθία' })

      expect(wrapper.findAll('a')[0]!.attributes('href'))
        .toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Φυτειά Βέροιας, Ημαθία')}`)
    })
  })
})
