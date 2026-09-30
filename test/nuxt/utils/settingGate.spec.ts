import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteLocationNormalized } from 'vue-router'
import accountReviewsEnabled from '~/middleware/account-reviews-enabled'
import cartEnabled from '~/middleware/cart-enabled'
import catalogueEnabled from '~/middleware/catalogue-enabled'
import favouritesEnabled from '~/middleware/favourites-enabled'
import feedbackEnabled from '~/middleware/feedback-enabled'
import newsletterEnabled from '~/middleware/newsletter-enabled'
import { createSettingGate } from '~/utils/settingGate'

/**
 * The single-tier merchant-setting gates. Each is a one-line
 * `createSettingGate(KEY)`, so the table proves every middleware reads
 * its OWN key (a copy-pasted key would gate the page on another
 * feature's switch), and the factory's three answers are asserted once
 * each: an explicit off is a 404, a missing row serves the page (these
 * settings ship ON), and an unreadable settings endpoint serves it too.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const SETTINGS = '/api/settings/public'
const to = { path: '/', fullPath: '/' } as RouteLocationNormalized

function answer(settings: Record<string, string>) {
  api.routes({ [SETTINGS]: { settings } })
}

const GATES = [
  ['account-reviews-enabled', accountReviewsEnabled, 'ACCOUNT_REVIEWS_ENABLED'],
  ['cart-enabled', cartEnabled, 'CART_ENABLED'],
  ['catalogue-enabled', catalogueEnabled, 'CATALOGUE_ENABLED'],
  ['favourites-enabled', favouritesEnabled, 'FAVOURITES_ENABLED'],
  ['feedback-enabled', feedbackEnabled, 'FEEDBACK_ENABLED'],
  ['newsletter-enabled', newsletterEnabled, 'NEWSLETTER_ENABLED'],
] as const

describe('setting-gate middlewares', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  describe.each(GATES)('%s', (_name, gate, key) => {
    it(`404s when ${key} is off`, async () => {
      answer({ [key]: 'False' })

      await expect(gate(to, to)).rejects.toMatchObject({ statusCode: 404 })
    })

    it(`serves the page when ${key} is on`, async () => {
      answer({ [key]: 'True' })

      await expect(gate(to, to)).resolves.toBeUndefined()
    })

    it(`ignores every other setting being off`, async () => {
      const others = Object.fromEntries(
        GATES.filter(([, , other]) => other !== key).map(([, , other]) => [other, 'False']),
      )
      answer(others)

      await expect(gate(to, to)).resolves.toBeUndefined()
    })
  })
})

describe('createSettingGate', () => {
  const gate = createSettingGate('SOME_FLAG')

  beforeEach(() => {
    clearNuxtData()
  })

  it('serves the page when the store has no row for the setting', async () => {
    answer({})

    await expect(gate(to, to)).resolves.toBeUndefined()
  })

  it('fails open when the settings endpoint cannot be read', async () => {
    api.routes({
      [SETTINGS]: () => { throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 }) },
    })

    await expect(gate(to, to)).resolves.toBeUndefined()
  })

  it('reads the settings once per render, however many gates run', async () => {
    answer({ SOME_FLAG: 'True', OTHER_FLAG: 'True' })

    await gate(to, to)
    await createSettingGate('OTHER_FLAG')(to, to)

    expect(api.callsTo(SETTINGS)).toHaveLength(1)
  })
})
