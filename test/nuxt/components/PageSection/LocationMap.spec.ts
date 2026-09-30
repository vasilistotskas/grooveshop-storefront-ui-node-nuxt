import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LocationMap from '~/components/PageSection/LocationMap.vue'

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

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { title: 'Τοποθεσία καταστήματος' }

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

  it('draws a canvas for coordinates alone', async () => {
    const wrapper = await mountMap({ lat: 40.6403, lng: 22.9439 })

    await vi.waitFor(() => expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true))
    const canvas = wrapper.find('[data-test="canvas"]')
    expect([canvas.attributes('data-lat'), canvas.attributes('data-lng')]).toEqual(['40.6403', '22.9439'])
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('draws the canvas at a zero coordinate — 0 is a place, not a missing value', async () => {
    const wrapper = await mountMap({ lat: 0, lng: 22.9439 })

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
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
  })

  it('renders nothing at all with neither a map nor an address', async () => {
    const wrapper = await mountMap({})

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('hides the canvas when no CARTO basemaps key is configured', async () => {
    // CARTO watermarks a keyless tile request rather than refusing it,
    // so an empty key must hide the canvas, not render a broken one.
    useRuntimeConfig().public.cartoBasemapsKey = ''

    const wrapper = await mountMap({ lat: 40.6403, lng: 22.9439 })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('still shows the address line with no key and no embed', async () => {
    useRuntimeConfig().public.cartoBasemapsKey = ''

    const wrapper = await mountMap({ lat: 40.6403, lng: 22.9439, address: '12 Main St' })

    expect(wrapper.find('section').text()).toBe('12 Main St')
  })
})
