/**
 * `useLoyaltySettings` reads the programme's figures off the ONE
 * `store-settings` payload every render already has: it makes no request
 * of its own, and answers `null`, never a default, when the payload
 * cannot give them.
 */
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { makeLoyaltyPublicSettings } from '~~/test/fixtures/loyalty'

let calls = 0
let fail = false
let settings: Record<string, string> = {}
registerEndpoint('/api/settings/public', () => {
  calls++
  if (fail) throw createError({ statusCode: 503 })
  return { settings }
})

/**
 * Reads the composable inside a component, as every consumer does. The
 * component stays mounted until the test ends (`enableAutoUnmount`): Nuxt
 * drops a key's data when its last reader unmounts.
 */
async function read() {
  let result!: ReturnType<typeof useLoyaltySettings>
  await mountSuspended(defineComponent({
    setup() {
      result = useLoyaltySettings()
      return () => null
    },
  }), { route: false })
  await flushPromises()
  return result
}

describe('useLoyaltySettings', () => {
  beforeEach(() => {
    clearNuxtData(STORE_SETTINGS_KEY)
    calls = 0
    fail = false
    settings = makeLoyaltyPublicSettings({ LOYALTY_POINTS_FACTOR: '1.5', LOYALTY_XP_PER_LEVEL: '2500' })
  })

  it('parses the store\'s figures from the settings payload', async () => {
    const loyalty = await read()

    expect(loyalty.value).toEqual({
      redemptionRatioEur: 100,
      pointsFactor: 1.5,
      tierMultiplierEnabled: false,
      pointsExpirationDays: 0,
      newCustomerBonusEnabled: false,
      newCustomerBonusPoints: 0,
      xpPerLevel: 2500,
    })
  })

  it('shares the one settings request with every other reader', async () => {
    await read()
    await read()

    expect(calls).toBe(1)
  })

  it('answers null when the settings lookup failed', async () => {
    fail = true

    expect((await read()).value).toBeNull()
  })

  it('answers null when a loyalty key is missing from the payload', async () => {
    const { LOYALTY_XP_PER_LEVEL: _missing, ...rest } = settings
    settings = rest

    expect((await read()).value).toBeNull()
  })
})
