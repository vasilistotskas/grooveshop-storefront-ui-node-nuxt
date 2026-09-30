import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ImgWithFallback from '~/components/ImgWithFallback.vue'

describe('ImgWithFallback', () => {
  // The PDP's LCP hint is not a declared prop: it reaches the <img>
  // only through `useAttrs()` (see Product/Image.spec.ts).
  it('forwards fetchpriority and loading to the underlying img', async () => {
    const wrapper = await mountSuspended(ImgWithFallback, {
      props: { src: '/img/placeholder.png', width: 100, height: 100 },
      attrs: { fetchpriority: 'high', loading: 'eager', alt: 'test' },
      route: false,
    })

    const img = wrapper.get('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('reserves the intrinsic aspect ratio when both dimensions are numeric', async () => {
    const wrapper = await mountSuspended(ImgWithFallback, {
      props: { src: '/img/placeholder.png', width: 400, height: 300 },
      route: false,
    })

    expect(wrapper.get('img').attributes('style')).toContain('aspect-ratio: 400 / 300')
  })

  it('swaps to the fallback image, keeping the alt, when the source fails to load', async () => {
    const wrapper = await mountSuspended(ImgWithFallback, {
      props: { src: '/img/missing.png', fallback: '/img/placeholder.png', width: 100, height: 100 },
      attrs: { alt: 'Γλάστρα' },
      route: false,
    })
    expect(wrapper.get('img').attributes('src')).toContain('missing.png')

    await wrapper.get('img').trigger('error')
    await flushPromises()

    expect(wrapper.emitted('error')).toHaveLength(1)
    const img = wrapper.get('img')
    expect(img.attributes('src')).toContain('placeholder.png')
    expect(img.attributes('src')).not.toContain('missing.png')
    expect(img.attributes('alt')).toBe('Γλάστρα')
  })
})
