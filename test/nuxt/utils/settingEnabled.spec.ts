import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { settingEnabled } from '~/utils/settingEnabled'

/**
 * The value reader behind every route gate and plugin that needs a
 * merchant flag before it can decide anything. Its two fallbacks are
 * different absences: `fallback` is "the store never set this row",
 * `onError` is "the settings could not be read at all".
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const SETTINGS = '/api/settings/public'

function answer(settings: Record<string, string>) {
  api.routes({ [SETTINGS]: { settings } })
}

function fail() {
  api.routes({
    [SETTINGS]: () => { throw Object.assign(new Error('Service Unavailable'), { statusCode: 503 }) },
  })
}

describe('settingEnabled', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  it.each([
    ['True', true],
    ['False', false],
    // A string-typed row a merchant typed by hand.
    ['1', true],
    ['yes', true],
    ['no', false],
  ])('reads %s as %s', async (raw, expected) => {
    answer({ FLAG: raw })

    expect(await settingEnabled('FLAG', { fallback: !expected })).toBe(expected)
  })

  it.each([[true], [false]])('answers the fallback (%s) for a missing row', async (fallback) => {
    answer({ OTHER: 'True' })

    expect(await settingEnabled('FLAG', { fallback, onError: !fallback })).toBe(fallback)
  })

  it('answers onError, not the fallback, when the lookup fails', async () => {
    fail()

    expect(await settingEnabled('FLAG', { fallback: false, onError: true })).toBe(true)
  })

  it('answers the fallback on a failed lookup when no onError is given', async () => {
    fail()

    expect(await settingEnabled('FLAG', { fallback: false })).toBe(false)
  })
})
