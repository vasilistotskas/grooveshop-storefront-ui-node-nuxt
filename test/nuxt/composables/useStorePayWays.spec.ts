import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const PAY_WAYS_URL = '/api/pay-way'

async function mountReaders(count: number) {
  await mountSuspended(defineComponent({
    async setup() {
      for (let i = 0; i < count; i++) await useStorePayWays()
      return () => h('div')
    },
  }), { route: false })
}

/**
 * The footer's "Pay with" row and the cart summary read the pay ways under
 * one key, so they must pass the same options: Nuxt keeps the first
 * reader's, and a second with others only warns.
 */
describe('useStorePayWays', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    api.routes({ [PAY_WAYS_URL]: { count: 0, results: [] } })
  })

  it('is one request for every reader', async () => {
    await mountReaders(2)

    expect(api.callsTo(PAY_WAYS_URL)).toHaveLength(1)
  })

  it('asks for nothing on a store without the cart', async () => {
    setTenantFeatures({ cart: false })

    await mountReaders(2)

    expect(api.callsTo(PAY_WAYS_URL)).toEqual([])
  })
})
