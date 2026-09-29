import { describe, it, expect, beforeEach } from 'vitest'
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
 * The canvas itself is stubbed — it is `.client`-only and pulls in
 * Leaflet. What is under test is which of the three shapes the section
 * chooses.
 */
const stubs = {
  PageSectionLocationCanvas: {
    name: 'PageSectionLocationCanvas',
    template: '<div data-test="canvas" />',
  },
}

describe('the location map band', () => {
  // The canvas additionally requires a CARTO basemaps key
  // (`shared/utils/carto-basemaps.ts`) — empty by default in the test
  // env. Set one so the coordinates-alone cases below exercise the
  // canvas path; the dedicated test further down clears it again to
  // cover the no-key gate.
  beforeEach(() => {
    useRuntimeConfig().public.cartoBasemapsKey = 'test-carto-key'
  })

  it('draws a canvas for coordinates alone', async () => {
    const wrapper = await mountSuspended(LocationMap, {
      props: { lat: 40.6403, lng: 22.9439 },
      global: { stubs },
    })

    expect(wrapper.find('section').exists()).toBe(true)
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('prefers the operator\'s own embed over the canvas', async () => {
    const wrapper = await mountSuspended(LocationMap, {
      props: {
        embedUrl: 'https://www.google.com/maps/embed?pb=x',
        lat: 40.6403,
        lng: 22.9439,
      },
      global: { stubs },
    })

    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
  })

  it('renders nothing at all with neither a map nor an address', async () => {
    const wrapper = await mountSuspended(LocationMap, {
      props: {},
      global: { stubs },
    })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('hides the canvas when no CARTO basemaps key is configured', async () => {
    // CARTO watermarks a keyless tile request rather than refusing it,
    // so an empty key must hide the canvas, not render a broken one.
    useRuntimeConfig().public.cartoBasemapsKey = ''
    const wrapper = await mountSuspended(LocationMap, {
      props: { lat: 40.6403, lng: 22.9439 },
      global: { stubs },
    })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('still shows the address line with no key and no embed', async () => {
    useRuntimeConfig().public.cartoBasemapsKey = ''
    const wrapper = await mountSuspended(LocationMap, {
      props: { lat: 40.6403, lng: 22.9439, address: '12 Main St' },
      global: { stubs },
    })

    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('12 Main St')
  })
})
