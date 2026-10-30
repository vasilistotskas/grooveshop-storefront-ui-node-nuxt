import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { failWith } from '~~/test/helpers/api'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const { mockLog } = vi.hoisted(() => ({
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

/** The product list as Django filters it by `id_In`: only the ids it still serves. */
const listServing = (...served: number[]) => (_url: string, options: { query: { id_In: string } }) => {
  const results = options.query.id_In.split(',').map(Number).filter(id => served.includes(id)).map(id => makeProductCard({ id }))
  return { count: results.length, links: {}, results }
}

/**
 * The hero's chips share one fetch key and ONE request: every named
 * product comes from the product list filtered by id, a product the list
 * does not serve is absent rather than fatal, and nothing is requested
 * where no slide names one.
 */
describe('useHeroProductChips', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant({ availableLocales: ['el', 'en'] })
  })

  const listCalls = () => api.callsTo('/api/products*')

  it('maps each product by id from one list request for the distinct ids', async () => {
    api.routes({ '/api/products': listServing(7, 9) })

    const chips = await useHeroProductChips([9, 7, 9])

    expect(Object.keys(chips.value)).toEqual(['7', '9'])
    expect(listCalls()).toEqual([
      { url: '/api/products', options: { query: { id_In: '7,9', pageSize: 2 } } },
    ])
  })

  it('makes one request however many slides name a product', async () => {
    api.routes({ '/api/products': listServing(1, 2, 3, 4, 5) })

    const chips = await useHeroProductChips([5, 4, 3, 2, 1])

    expect(Object.keys(chips.value)).toHaveLength(5)
    expect(listCalls()).toHaveLength(1)
  })

  it('leaves out a product the list no longer serves, and keeps the rest', async () => {
    api.routes({ '/api/products': listServing(7) })

    const chips = await useHeroProductChips([7, 9])

    expect(Object.keys(chips.value)).toEqual(['7'])
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('logs a server fault and fails the fetch instead of caching a chip-less answer', async () => {
    api.routes({ '/api/products': failWith(503) })

    const chips = await useHeroProductChips([7, 9])

    expect(chips.value).toEqual({})
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'hero-product-chips', productIds: [7, 9], status: 503 }),
    )
    expect(useNuxtApp().payload._errors['hero-product-chips-el-7-9']).toBeTruthy()
  })

  it('answers again for another set of ids and for another locale', async () => {
    api.routes({ '/api/products': listServing(7, 9) })

    await useHeroProductChips([7])
    await useHeroProductChips([7])
    expect(listCalls()).toHaveLength(1)

    await useHeroProductChips([7, 9])
    expect(listCalls()).toHaveLength(2)

    // A locale switch also refreshes the keys already read; the new
    // key's own request is among them.
    const before = listCalls().length
    await useNuxtApp().$i18n.setLocale('en')
    await useHeroProductChips([7])
    expect(listCalls().length).toBeGreaterThan(before)
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('requests nothing for no ids', async () => {
    const chips = await useHeroProductChips([])

    expect(chips.value).toEqual({})
    expect(listCalls()).toEqual([])
  })

  it('requests no product on a store without the catalogue', async () => {
    setTenantFeatures({ catalogue: false })
    api.routes({ '/api/products': listServing(3, 5) })

    const chips = await useHeroProductChips([3, 5])

    expect(chips.value).toEqual({})
    expect(listCalls()).toEqual([])
  })
})
