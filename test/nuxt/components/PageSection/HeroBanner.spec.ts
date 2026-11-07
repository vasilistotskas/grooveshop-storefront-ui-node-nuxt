import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { makeResolvedImage } from '~~/test/fixtures/media'
import HeroBanner from '~/components/PageSection/HeroBanner.vue'

const device = vi.hoisted(() => ({ mobile: { value: false } }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobile }))

const mountBanner = (props: Record<string, unknown>) => mountSuspended(HeroBanner, { route: false, props })
const ART = 'https://assets.example.test/hero.jpg'

describe('PageSection/HeroBanner image', () => {
  beforeEach(() => {
    device.mobile.value = false
  })

  it('draws the phone image on a phone and the desk one elsewhere', async () => {
    const props = { heading: 'Καλώς ήρθατε', image: makeResolvedImage(ART, 'Desk'), mobileImage: makeResolvedImage('https://assets.example.test/phone.jpg') }

    const desk = await mountBanner(props)
    device.mobile.value = true
    const phone = await mountBanner(props)

    expect(desk.get('img').attributes('src')).toContain('hero.jpg')
    expect(phone.get('img').attributes('src')).toContain('phone.jpg')
    // The phone image has no description of its own here: the desk one's is used.
    expect(phone.get('img').attributes('alt')).toBe('Desk')
  })

  it('draws the phone image alone on a phone when the desk image is gone, and the typographic band on a desk', async () => {
    const props = { heading: 'Καλώς ήρθατε', image: { status: 'missing' }, mobileImage: makeResolvedImage('https://assets.example.test/phone.jpg', 'Στο κινητό') }

    device.mobile.value = true
    const phone = await mountBanner(props)
    device.mobile.value = false
    const desk = await mountBanner(props)

    expect(phone.get('img').attributes('src')).toContain('phone.jpg')
    expect(phone.get('img').attributes('alt')).toBe('Στο κινητό')
    expect(desk.find('img').exists()).toBe(false)
  })

  it('draws the desk image on a phone when the phone image is gone', async () => {
    device.mobile.value = true
    const wrapper = await mountBanner({ heading: 'H', image: makeResolvedImage(ART), mobileImage: { status: 'missing' } })

    expect(wrapper.get('img').attributes('src')).toContain('hero.jpg')
  })

  it('draws the image with its own description', async () => {
    const wrapper = await mountBanner({ heading: 'Καλώς ήρθατε', image: makeResolvedImage(ART, 'Η βιτρίνα') })

    expect(wrapper.get('img').attributes('alt')).toBe('Η βιτρίνα')
  })

  it('names the image by the heading when it has no description', async () => {
    const wrapper = await mountBanner({ heading: 'Καλώς ήρθατε', image: makeResolvedImage(ART) })

    expect(wrapper.get('img').attributes('alt')).toBe('Καλώς ήρθατε')
  })

  it('gives a decorative image an empty description, whatever the asset says', async () => {
    const wrapper = await mountBanner({ heading: 'Καλώς ήρθατε', image: makeResolvedImage(ART, 'Η βιτρίνα'), imageDecorative: true })

    expect(wrapper.get('img').attributes('alt')).toBe('')
  })

  it.each([{ status: 'missing' }, { status: 'failed' }])('draws the typographic band when the image is $status', async (image) => {
    const wrapper = await mountBanner({ heading: 'Καλώς ήρθατε', image })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Καλώς ήρθατε')
  })
})
