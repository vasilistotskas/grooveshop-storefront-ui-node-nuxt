import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { makeProduct } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The product page's data, shared by every drawing of the page: the
 * product and what a missing or failing one becomes, its images and
 * reviews, and its name. The drawings' own spec
 * (`components/Storefront/ProductDetail.spec.ts`) covers what they show.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const empty = { count: 0, next: null, previous: null, results: [] }

function serve(product: unknown) {
  api.routes({
    '/api/products/123': product,
    '/api/products/123/images': [],
    '/api/products/123/*': empty,
    '/api/*': empty,
  })
}

/** `useI18n` needs a component instance, so run the composable in one. */
async function productDetail() {
  let detail!: Awaited<ReturnType<typeof useProductDetail>>
  await mountSuspended(defineComponent({
    async setup() {
      detail = await useProductDetail('123', useI18n().t)
      return () => null
    },
  }), { route: false })
  return detail
}

beforeEach(() => {
  clearNuxtData()
  setTenant()
})

describe('useProductDetail', () => {
  it('asks for the images and the reviews while the product is still on its way', async () => {
    let answerProduct!: () => void
    serve(() => new Promise((resolve) => {
      answerProduct = () => resolve(makeProduct({ id: 123 }))
    }))

    const loading = productDetail()
    await vi.waitFor(() =>
      expect(api.callsTo('/api/products/*').map(call => call.url)).toEqual(
        expect.arrayContaining(['/api/products/123/images', '/api/products/123/reviews']),
      ),
    )
    answerProduct()

    await expect(loading).resolves.toMatchObject({ productStock: expect.anything() })
  })

  // The selector and the offer panel are drawn after this resolves; asked
  // for by them, their requests started only once the product, its
  // images, its reviews and the categories were all in.
  it('asks for the offers while the product is on its way, and for the variants once it names a group', async () => {
    setTenantFeatures({ promotions: true })
    let answerProduct!: () => void
    api.routes({
      '/api/products/123': () => new Promise((resolve) => {
        answerProduct = () => resolve(makeProduct({ id: 123, variantGroup: 7 }))
      }),
      '/api/products/123/images': [],
      '/api/promotions/product/123': [],
      '/api/products/123/variants': { axes: [], variants: [] },
      '/api/*': empty,
    })
    const urls = () => api.callsTo('/api/*').map(call => call.url)

    const loading = productDetail()
    await vi.waitFor(() => expect(urls()).toContain('/api/promotions/product/123'))
    expect(urls()).not.toContain('/api/products/123/variants')
    answerProduct()
    await loading

    expect(urls().filter(url => url === '/api/products/123/variants')).toHaveLength(1)
    expect(urls().filter(url => url === '/api/promotions/product/123')).toHaveLength(1)
  })

  it('does not ask for the variants of a product outside a variant group', async () => {
    serve(makeProduct({ id: 123, variantGroup: null }))

    await productDetail()

    expect(api.callsTo('/api/products/123/variants')).toEqual([])
  })

  it('is a 404 for a product Django does not have', async () => {
    serve(failWith(404))

    await expect(productDetail()).rejects.toMatchObject({ statusCode: 404 })
  })

  it('is a 503, temporary for crawlers, when Django fails', async () => {
    serve(failWith(502))

    await expect(productDetail()).rejects.toMatchObject({ statusCode: 503 })
  })

  // The Greek row is written (its description) but its name was left
  // empty: a row-level read would take that row and name nothing.
  it('names the product in another language where the page\'s row has no name', async () => {
    setTenant({ defaultLocale: 'en', availableLocales: ['el', 'en'] })
    serve(makeProduct({
      id: 123,
      translations: {
        el: { name: '', description: '<p>Φορτιστής ταξιδιού</p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
        en: { name: 'Travel charger', description: '', seoTitle: '', seoDescription: '', seoKeywords: '' },
      },
    }))

    const detail = await productDetail()

    expect(detail.productName.value).toBe('Travel charger')
  })
})
