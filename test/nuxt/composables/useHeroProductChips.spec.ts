import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { failWith } from '~~/test/helpers/api'
import { makeProduct } from '~~/test/fixtures/product'

const { mockLog } = vi.hoisted(() => ({
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)

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

  it('leaves out a product that is gone, and keeps the rest', async () => {
    api.routes({
      '/api/products/7': makeProduct({ id: 7 }),
      '/api/products/9': failWith(404),
    })

    const chips = await useHeroProductChips([7, 9])

    expect(Object.keys(chips.value)).toEqual(['7'])
  })

  it('logs a server fault and fails the fetch instead of caching a chip-less answer', async () => {
    api.routes({
      '/api/products/7': makeProduct({ id: 7 }),
      '/api/products/9': failWith(503),
    })

    const chips = await useHeroProductChips([7, 9])

    expect(chips.value).toEqual({})
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'hero-product-chips', productId: 9, status: 503 }),
    )
    expect(useNuxtApp().payload._errors['hero-product-chips-el-7-9']).toBeTruthy()
  })

  it('does not log a product that is simply gone', async () => {
    api.routes({ '/api/products/9': failWith(404) })

    await useHeroProductChips([9])

    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('answers again for another set of ids and for another locale', async () => {
    api.routes({ '/api/products/*': (url: string) => makeProduct({ id: Number(url.split('/').pop()) }) })

    const callsTo = (id: number) => api.callsTo(`/api/products/${id}`).length

    await useHeroProductChips([7])
    await useHeroProductChips([7])
    expect(callsTo(7)).toBe(1)

    await useHeroProductChips([7, 9])
    expect(callsTo(9)).toBe(1)

    const before = callsTo(7)
    await useNuxtApp().$i18n.setLocale('en')
    await useHeroProductChips([7])
    expect(callsTo(7)).toBeGreaterThan(before)
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('requests nothing for no ids', async () => {
    const chips = await useHeroProductChips([])

    expect(chips.value).toEqual({})
    expect(api.callsTo('/api/products/*')).toEqual([])
  })
})
