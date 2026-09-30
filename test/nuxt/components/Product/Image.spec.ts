import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductImage from '~/components/Product/Image.vue'
import WebsideProductImage from '~/components/variants/webside/Product/Image.vue'
import type { ProductImage as ProductImageType } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
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
      props: { imgLoading: 'eager' },
      attrs: { fetchpriority: 'high' },
      route: false,
    })

    const img = wrapper.get('img')
    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('names the image after its translated title', async () => {
    const wrapper = await mountSuspended(C, {
      props: {
        image: {
          id: 1,
          uuid: fixtureUuid(5, 1),
          product: 1,
          image: '/img/products/1.jpg',
          imageUrl: '/img/products/1.jpg',
          imageSizeKb: 12,
          altText: '',
          isMain: true,
          sortOrder: 0,
          translations: { el: { title: 'Κόκκινη γλάστρα' } },
          mainImagePath: '/img/products/1.jpg',
          createdAt: FIXTURE_TIMESTAMP,
        } satisfies ProductImageType,
      },
      route: false,
    })

    expect(wrapper.get('img').attributes('alt')).toBe('Κόκκινη γλάστρα')
  })

  it('falls back to a generic alt text when the image has no title', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.get('img').attributes('alt')).toBe('Εικόνα προϊόντος')
  })
})
