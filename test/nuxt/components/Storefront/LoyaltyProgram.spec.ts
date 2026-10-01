import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyProgram from '~/components/Storefront/LoyaltyProgram.vue'
import WebsideLoyaltyProgram from '~/components/variants/webside/Storefront/LoyaltyProgram.vue'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeLoyaltySettings } from '~~/test/fixtures/loyalty'
import { trees } from '~~/test/helpers/trees'

/**
 * The public loyalty programme page states the store's own redemption
 * ratio. A store that redeems no points (a ratio of 0) gets no
 * conversion card at all — it used to read "0 points = 1€".
 */
const settings = createAsyncDataMock<LoyaltySettings>()
mockNuxtImport('useLoyalty', () => () => ({ fetchSettings: () => settings }))

describe.each(trees(LoyaltyProgram, WebsideLoyaltyProgram))('$tree Storefront/LoyaltyProgram', ({ C }) => {
  beforeEach(() => {
    settings.reset()
    settings.status.value = 'success'
  })

  const mount = () => mountSuspended(C, { route: false })

  it('states the store\'s own redemption ratio, with a worked example', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 50 })

    const text = (await mount()).text()

    expect(text).toContain('Κάθε 50 πόντοι ισούνται με 1€ έκπτωση')
    expect(text).toContain('250 πόντοι = 5€')
  })

  it('offers no conversion for a store that redeems no points', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 0 })

    const text = (await mount()).text()

    expect(text).not.toContain('πόντοι ισούνται με')
  })
})
