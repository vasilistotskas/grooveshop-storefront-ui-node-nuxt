import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { failWith } from '~~/test/helpers/api'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

/**
 * The hero's chips share one fetch key: every named product is read
 * together, a product that cannot be read is absent rather than fatal,
 * and nothing is requested where no slide names one.
 */
describe('useHeroProductChips', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  it('maps each readable product by id, asking once per distinct id', async () => {
    api.routes({ '/api/products/*': (url: string) => makeProduct({ id: Number(url.split('/').pop()) }) })

    const chips = await useHeroProductChips([9, 7, 9])

    expect(Object.keys(chips.value)).toEqual(['7', '9'])
    expect(api.callsTo('/api/products/*').map(call => call.url).sort())
      .toEqual(['/api/products/7', '/api/products/9'])
  })

  it('leaves out a product that fails, and keeps the rest', async () => {
    api.routes({
      '/api/products/7': makeProduct({ id: 7 }),
      '/api/products/9': failWith(404),
    })

    const chips = await useHeroProductChips([7, 9])

    expect(Object.keys(chips.value)).toEqual(['7'])
  })

  it('requests nothing for no ids', async () => {
    const chips = await useHeroProductChips([])

    expect(chips.value).toEqual({})
    expect(api.callsTo('/api/products/*')).toEqual([])
  })
})
