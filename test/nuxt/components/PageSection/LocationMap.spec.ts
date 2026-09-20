import { describe, it, expect } from 'vitest'
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
})
