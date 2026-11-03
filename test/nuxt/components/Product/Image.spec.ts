import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductImage from '~/components/Product/Image.vue'
import WebsideProductImage from '~/components/variants/webside/Product/Image.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The PDP's LCP optimisation relies on `fetchpriority="high"` falling
 * through two layers of attrs inheritance: ProductImage ($attrs) →
 * ImgWithFallback (`useAttrs()` merged into its NuxtImg props) → <img>.
 * Neither declares it as a prop, so a refactor that adds
 * `inheritAttrs: false` or stops spreading `useAttrs()` would silently
 * drop the hint. ImgWithFallback's own half is in its spec.
 */
describe.each(trees(ProductImage, WebsideProductImage))('$tree Product/Image', ({ C }) => {
  it('forwards fetchpriority and its loading prop through both wrappers to the img', async () => {
    const wrapper = await mountSuspended(C, {
      props: { imgLoading: 'eager', alt: '' },
      attrs: { fetchpriority: 'high' },
      route: false,
    })

    const img = wrapper.get('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('draws the alt text it is given', async () => {
    const wrapper = await mountSuspended(C, { props: { alt: 'Κόκκινη γλάστρα' }, route: false })

    expect(wrapper.get('img').attributes('alt')).toBe('Κόκκινη γλάστρα')
  })
})
