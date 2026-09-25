/**
 * `fetchStoreSettings` (route middleware, plugins) reads the SAME
 * `store-settings` entry the components register, so a render pays for
 * one `/api/settings/public` request however many gates and readers it
 * has, and a failed lookup still reaches each gate's own `onError`.
 */
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'

let calls = 0
let fail = false
registerEndpoint('/api/settings/public', () => {
  calls++
  if (fail) throw createError({ statusCode: 503 })
  return { settings: { CART_ENABLED: 'true' } }
})

describe('fetchStoreSettings', () => {
  beforeEach(() => {
    clearNuxtData(STORE_SETTINGS_KEY)
    calls = 0
    fail = false
  })

  it('returns the settings and stores them under the shared key', async () => {
    const result = await fetchStoreSettings()
    expect(result.settings).toEqual({ CART_ENABLED: 'true' })
    expect(useNuxtData(STORE_SETTINGS_KEY).data.value).toEqual(result)
  })

  it('does not fetch again once the entry holds the answer', async () => {
    await fetchStoreSettings()
    await fetchStoreSettings()
    expect(calls).toBe(1)
  })

  it('throws when the lookup failed, so the caller applies its fallback', async () => {
    fail = true
    await expect(fetchStoreSettings()).rejects.toBeTruthy()
  })
})
