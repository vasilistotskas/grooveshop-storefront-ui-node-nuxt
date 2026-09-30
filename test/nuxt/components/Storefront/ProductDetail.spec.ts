import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ProductDetail from '~/components/Storefront/ProductDetail.vue'
import WebsideProductDetail from '~/components/variants/webside/Storefront/ProductDetail.vue'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A product page counts one view of the product in its route, on the
 * client (`useViewCount` posts nothing during SSR).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const { route } = vi.hoisted(() => ({ route: { params: { id: '123', slug: 'bluetooth-speaker' } } }))
mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: `/products/${route.params.id}/${route.params.slug}`,
  fullPath: `/products/${route.params.id}/${route.params.slug}`,
  name: 'products-id-slug___el',
  hash: '',
  matched: [],
  meta: {},
}))

describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail view count (%s tree)', (_tree, Component) => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': makeProduct({ id: 123 }),
      '/api/products/123/images': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  })

  it('posts one view for the product in the route', async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(api.callsTo('/api/products/*').filter(call => call.url.endsWith('/update-view-count'))).toEqual([
      { url: '/api/products/123/update-view-count', options: expect.objectContaining({ method: 'POST' }) },
    ])
    wrapper.unmount()
  })
})
