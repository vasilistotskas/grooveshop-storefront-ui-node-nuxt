import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { makeResolvedImage } from '~~/test/fixtures/media'
import HeroCarousel from '~/components/variants/webside/PageSection/HeroCarousel.vue'

const device = vi.hoisted(() => ({ mobile: { value: false } }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobile }))

const DESK = ['https://assets.example.test/desk-1.png', 'https://assets.example.test/desk-2.png']
const PHONE = ['https://assets.example.test/phone-1.png']

const mountCarousel = (props: Record<string, unknown>) => mountSuspended(HeroCarousel, { route: false, props })

describe('webside hero_carousel images', () => {
  beforeEach(() => {
    device.mobile.value = false
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
