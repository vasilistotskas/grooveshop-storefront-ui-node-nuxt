import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import ProductsCategory from '~/components/Storefront/ProductsCategory.vue'
import WebsideProductsCategory from '~/components/variants/webside/Storefront/ProductsCategory.vue'
import type { ProductCategoryDetail } from '~~/shared/openapi/types.gen'
import { makeProductSearchHit, makeProductSearchResponse } from '~~/test/fixtures/productFilters'
import { failWith } from '~~/test/helpers/api'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * A category's products page. Which category it is, the 404 or 503 for one
 * that is missing or failing, the head and the structured data are one
 * implementation (`useProductCategoryPage`) that both trees run; the trail
 * above the title is the default drawing's; both draw the filters.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const route = vi.hoisted(() => ({ params: { id: '5', slug: 'chargers' } }))
mockNuxtImport('useRoute', () => () => ({
  name: 'products-category-id-slug___el',
  params: route.params,
  query: {},
  path: `/products/category/${route.params.id}/${route.params.slug}`,
  fullPath: `/products/category/${route.params.id}/${route.params.slug}`,
  hash: '',
  meta: {},
  matched: [],
}))

// What the page hands the head and the schema.org module.
const { seo, schema } = vi.hoisted(() => ({
  seo: { value: {} as Record<string, any> },
  schema: { nodes: [] as Array<Record<string, any>> },
}))
mockNuxtImport('useSeoMeta', () => (input: Record<string, unknown>) => {
  seo.value = input
})
mockNuxtImport('useSchemaOrg', () => (nodes: Array<Record<string, any>>) => {
  schema.nodes = nodes
})
mockNuxtImport('defineItemList', () => (input: unknown) => ({ itemList: input }))
mockNuxtImport('defineWebPage', () => (input: unknown) => ({ webPage: input }))

const CATEGORY = {
  id: 5,
  slug: 'chargers',
  parent: null,
  translations: {
    el: {
      name: 'Φορτιστές',
      description: '<p>Όλοι οι <strong>φορτιστές</strong>.</p>',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    },
  },
} as unknown as ProductCategoryDetail

const read = (file: string) => YAML.parse(
  parseSfc(resolve(REPO, file)).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const MESSAGES = {
  default: read('app/components/Storefront/ProductsCategory.vue'),
  webside: read('app/components/variants/webside/Storefront/ProductsCategory.vue'),
}

const HITS = [makeProductSearchHit({ id: 11, master: 5, slug: 'charger' })]

describe.each(trees(ProductsCategory, WebsideProductsCategory))('$tree Storefront/ProductsCategory', ({ tree, C, own }) => {
  beforeEach(() => {
    clearNuxtData()
    seo.value = {}
    schema.nodes = []
    route.params = { id: '5', slug: 'chargers' }
    setTenant()
    serve()
  })

  function serve(category: unknown = CATEGORY) {
    api.routes({
      '/api/products/categories/5': category,
      '/api/products/categories/all': [],
      '/api/products/search': makeProductSearchResponse({ results: HITS }),
    })
  }

  const stubs = {
    ProductsBrowse: true,
    ProductsCategoryChips: true,
    ProductsHeader: true,
    [own('ProductsList')]: true,
    [own('ProductsSidebar')]: true,
    [own('PageWrapper')]: { template: '<div><slot /></div>' },
    [own('PageTitle')]: true,
  }
  const mount = async () => {
    const wrapper = await mountSuspended(C, { route: false, global: { stubs } })
    await flushPromises()
    return wrapper
  }

  it('asks for the category in the route, in the page language', async () => {
    await mount()

    expect(api.callsTo('/api/products/categories/5').map(call => call.options.query)).toEqual([{ languageCode: 'el' }])
  })

  it('makes ONE products search: the first twelve products of the category and the filter column counts', async () => {
    await mount()

    const searches = api.callsTo('/api/products/search').map(call => call.options.query)
    expect(searches).toHaveLength(1)
    expect(searches[0]).toMatchObject({
      languageCode: 'el',
      categories: '5',
      scopeCategory: 5,
      limit: 12,
      offset: 0,
      sidebarFacets: true,
    })
  })

  it('heads the page with the category\'s name, and its description as plain text', async () => {
    await mount()

    expect(seo.value.title()).toBe(MESSAGES[tree].page.title.replace('{name}', 'Φορτιστές'))
    expect(seo.value.ogTitle()).toBe('Φορτιστές')
    expect(seo.value.description()).toBe('Όλοι οι φορτιστές.')
  })

  it('lists the category\'s products as the collection\'s items', async () => {
    await mount()

    const list = schema.nodes.find(node => node.itemList)!.itemList.value
    expect(list.name).toBe('Φορτιστές')
    expect(list.itemListElement).toEqual([
      expect.objectContaining({ position: 1, url: expect.stringMatching(/\/products\/5\/charger$/) }),
    ])
  })

  it.each([
    [404, 404],
    [500, 503],
    [502, 503],
  ])('is a %i for a category Django answers %i for', async (statusCode, expected) => {
    api.routes({ '/api/products/categories/5': failWith(statusCode) })
    let captured: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((error) => {
          captured ??= error
          return false
        })
        return () => h(C, null, {})
      },
    })

    await mountSuspended(Parent, { route: false, global: { stubs } })
    await flushPromises()

    expect(captured).toMatchObject({ statusCode: expected })
  })
})
