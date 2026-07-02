import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductImage from '~/components/Product/Image.vue'
import ImgWithFallback from '~/components/ImgWithFallback.vue'

/**
 * The PDP's LCP optimization relies on ``fetchpriority="high"`` falling
 * through two layers of attrs inheritance:
 * ProductImage ($attrs) → ImgWithFallback (useAttrs() merged into
 * mainImageProps) → NuxtImg → <img>. Neither component declares it as
 * a prop, so a refactor that adds ``inheritAttrs: false`` or stops
 * spreading ``useAttrs()`` would silently drop the hint — these tests
 * pin the chain.
 */
describe('ImgWithFallback attr fall-through', () => {
  it('forwards fetchpriority and loading to the underlying img', async () => {
    const wrapper = await mountSuspended(ImgWithFallback, {
      props: {
        src: '/img/placeholder.png',
        width: 100,
        height: 100,
      },
      attrs: {
        fetchpriority: 'high',
        loading: 'eager',
        alt: 'test',
      },
    })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })
})

describe('ProductImage attr fall-through', () => {
  it('forwards fetchpriority through both wrappers to the img element', async () => {
    const wrapper = await mountSuspended(ProductImage, {
      props: {
        imgLoading: 'eager',
      },
      attrs: {
        fetchpriority: 'high',
      },
    })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })
})
