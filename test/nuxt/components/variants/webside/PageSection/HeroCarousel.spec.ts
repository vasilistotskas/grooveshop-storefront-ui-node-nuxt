import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { makeResolvedImage } from '~~/test/fixtures/media'
import { setTenant } from '~~/test/helpers/tenant'
import HeroCarousel from '~/components/variants/webside/PageSection/HeroCarousel.vue'

const device = vi.hoisted(() => ({ mobile: { value: false } }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobile }))

const DESK = ['https://assets.example.test/desk-1.png', 'https://assets.example.test/desk-2.png']
const PHONE = ['https://assets.example.test/phone-1.png']

const mountCarousel = (props: Record<string, unknown>) => mountSuspended(HeroCarousel, { route: false, props })

describe('webside hero_carousel images', () => {
  const PLATFORM_PATH = 'https://assets.platform.test/media_stream-image'
  const LIBRARY_PATH = 'media/webside/uploads/builder/banner.png'

  beforeEach(() => {
    device.mobile.value = false
    useRuntimeConfig().public.mediaStreamPath = PLATFORM_PATH
    setTenant({ storeName: 'Webside', assetsDomain: '' })
  })

  it('draws a library image through the media service, never IPX, with the description of its asset', async () => {
    const wrapper = await mountCarousel({ artworks: [makeResolvedImage(LIBRARY_PATH, 'Η προσφορά της εβδομάδας')] })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toContain(`${PLATFORM_PATH}/${LIBRARY_PATH}`)
    expect(img.attributes('src')).not.toContain('/_ipx/')
    // The media service's own URL shape: the source, then the size the slide draws at.
    expect(img.attributes('src')).toContain(`${LIBRARY_PATH}/1194/418/`)
    expect(img.attributes('alt')).toBe('Η προσφορά της εβδομάδας')
  })

  it('draws a library image from the own assets domain of the store when it has one', async () => {
    setTenant({ storeName: 'Webside', assetsDomain: 'assets.webside.test' })
    const wrapper = await mountCarousel({ artworks: [makeResolvedImage(LIBRARY_PATH, 'Η προσφορά')] })

    expect(wrapper.get('img').attributes('src')).toContain(`https://assets.webside.test/media_stream-image/${LIBRARY_PATH}`)
  })

  it('draws a linked library image through the media service too', async () => {
    const wrapper = await mountCarousel({ artworks: [makeResolvedImage(LIBRARY_PATH, 'Η προσφορά')], link: '/products' })

    const img = wrapper.get('a[href="/products"] img')
    expect(img.attributes('src')).toContain(`${LIBRARY_PATH}/1194/418/`)
    expect(img.attributes('alt')).toBe('Η προσφορά')
  })

  it('names a library image with no description of its own by the store', async () => {
    const wrapper = await mountCarousel({ artworks: [makeResolvedImage(LIBRARY_PATH)] })

    expect(wrapper.get('img').attributes('alt')).toBe('Webside')
  })

  it('draws an app image through IPX, named by the store, as before', async () => {
    const wrapper = await mountCarousel({ artworks: [makeResolvedImage('/img/main-banner.png')] })

    expect(wrapper.get('img').attributes('src')).toContain('/_ipx/')
    expect(wrapper.get('img').attributes('src')).toContain('/img/main-banner.png')
    expect(wrapper.get('img').attributes('alt')).toBe('Webside')
  })

  it('draws the artworks on a desk', async () => {
    const wrapper = await mountCarousel({ artworks: DESK.map(path => makeResolvedImage(path)), mobileArtworks: PHONE.map(path => makeResolvedImage(path)) })

    expect(wrapper.findAll('img').map(img => img.attributes('src'))).toEqual(DESK)
  })

  it('draws the phone artworks instead, all of them, on a phone', async () => {
    device.mobile.value = true
    const wrapper = await mountCarousel({ artworks: DESK.map(path => makeResolvedImage(path)), mobileArtworks: PHONE.map(path => makeResolvedImage(path)) })

    expect(wrapper.findAll('img').map(img => img.attributes('src'))).toEqual(PHONE)
  })

  it('draws the desk artworks on a phone that has none of its own', async () => {
    device.mobile.value = true
    const wrapper = await mountCarousel({ artworks: DESK.map(path => makeResolvedImage(path)) })

    expect(wrapper.findAll('img').map(img => img.attributes('src'))).toEqual(DESK)
  })

  it('links the artwork it draws when the layout gives a link', async () => {
    const wrapper = await mountCarousel({ artworks: [makeResolvedImage(DESK[0]!)], link: '/products' })

    expect(wrapper.get('a[href="/products"] img').attributes('src')).toBe(DESK[0])
  })

  it('draws nothing for an artwork that is gone', async () => {
    const wrapper = await mountCarousel({ artworks: [{ status: 'missing' }, makeResolvedImage(DESK[1]!)] })

    expect(wrapper.findAll('img').map(img => img.attributes('src'))).toEqual([DESK[1]])
  })
})
