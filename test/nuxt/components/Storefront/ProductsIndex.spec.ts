import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import ProductsIndex from '~/components/Storefront/ProductsIndex.vue'
import WebsideProductsIndex from '~/components/variants/webside/Storefront/ProductsIndex.vue'
import { makeProductSearchHit, makeProductSearchResponse } from '~~/test/fixtures/productFilters'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The store-wide products page. What it does besides drawing the listing
 * is one implementation (`useProductsIndexPage`) that both trees run: a
 * small page-1 search that makes the collection machine-readable, the
 * head, and the store's own branded sections above the listing.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// What the page hands the head and the schema.org module.
const { seo, schema } = vi.hoisted(() => ({
  seo: { value: {} as Record<string, unknown> },
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

const read = (file: string) => YAML.parse(
  parseSfc(resolve(REPO, file)).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const MESSAGES = {
  default: read('app/components/Storefront/ProductsIndex.vue'),
  webside: read('app/components/variants/webside/Storefront/ProductsIndex.vue'),
}

const HITS = [makeProductSearchHit({ id: 11, master: 5, slug: 'charger' }), makeProductSearchHit({ id: 12, master: 12, slug: 'cable' })]

describe.each(trees(ProductsIndex, WebsideProductsIndex))('$tree Storefront/ProductsIndex', ({ tree, C, own }) => {
  beforeEach(() => {
    clearNuxtData()
    seo.value = {}
    schema.nodes = []
    setTenant()
    api.routes({
      '/api/products/search': makeProductSearchResponse({ results: HITS }),
      '/api/page-config/products': { layout: null },
    })
  })

  const stubs = {
    ProductsBrowse: true,
    ProductsCategoryChips: true,
    [own('ProductsSidebar')]: true,
    [own('ProductsList')]: true,
    [own('ProductCategoriesNav')]: true,
  }
  const mount = async () => {
    const wrapper = await mountSuspended(C, { route: false, global: { stubs } })
    await flushPromises()
    return wrapper
  }

  it('asks for the first twelve products, once, in the page language, for the structured data', async () => {
    await mount()

    expect(api.callsTo('/api/products/search').map(call => call.options.query)).toEqual([
      { languageCode: 'el', limit: 12, offset: 0 },
    ])
  })

  it('titles the page for search engines with the SEO title, not the h1', async () => {
    await mount()

    const messages = MESSAGES[tree]
    expect((seo.value.title as () => string)()).toBe(messages.seo.title)
    expect((seo.value.description as () => string)()).toBe(messages.seo.description)
    expect(seo.value.ogType).toBe('website')
  })

  it('lists the products it fetched as the collection\'s items, each at its own address', async () => {
    await mount()

    const list = schema.nodes.find(node => node.itemList)!.itemList.value
    expect(list.name).toBe(MESSAGES[tree].title)
    expect(list.itemListElement).toEqual([
      expect.objectContaining({ position: 1, name: HITS[0]!.name, url: expect.stringMatching(/\/products\/5\/charger$/) }),
      expect.objectContaining({ position: 2, name: HITS[1]!.name, url: expect.stringMatching(/\/products\/12\/cable$/) }),
    ])
    expect(schema.nodes.find(node => node.webPage)!.webPage).toEqual({ '@type': 'CollectionPage' })
  })
})
