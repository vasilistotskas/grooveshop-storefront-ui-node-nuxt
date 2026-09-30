import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Every flag reads off the ONE per-render settings payload, so the
// mock answers `/api/settings/public` with a whole record.
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
// `useApi` transports through Nuxt's own `$fetch`.
mockNuxtImport('$fetch', () => api)

function serveSettings(settings: Record<string, string>) {
  api.routes({ '/api/settings/public': { settings } })
}

/**
 * Registers the readers in the app's context, plus the payload's own
 * `unavailable`, so a test can wait for the request to have SETTLED —
 * a fallback asserted before it lands passes for the wrong reason.
 */
function read<T>(readers: () => T) {
  // `runWithContext` is typed as possibly async; these readers are sync.
  let out!: ReturnType<typeof useStoreSettings> & { result: T }
  useNuxtApp().runWithContext(() => {
    out = { ...useStoreSettings(), result: readers() }
  })
  return out
}

/** The request settles within a few ticks; poll at that grain, not vitest's 50ms default. */
const POLL = { interval: 1 }

describe('useSettingFlag / useSettingValue', () => {
  beforeEach(() => {
    // The payload is cached by key across the file's shared Nuxt app;
    // each test starts from an empty cache so its own record is read.
    clearNuxtData(STORE_SETTINGS_KEY)
  })

  it.each([
    ['True', false, true],
    ['False', true, false],
    ['1', false, true],
    ['yes', false, true],
    ['no', true, false],
  ])('reads %j as %s→%s: the stored value wins over the fallback', async (raw, fallback, expected) => {
    serveSettings({ SOME_FLAG: raw })

    const { result: flag } = read(() => useSettingFlag('SOME_FLAG', { fallback }))

    await vi.waitFor(() => expect(flag.value).toBe(expected), POLL)
  })

  it('applies each caller\'s fallback to a key the loaded payload lacks', async () => {
    serveSettings({ OTHER_KEY: 'x' })

    const { settings, result: [open, closed] } = read(() => [
      useSettingFlag('UI_FLAG_NO_ROW_OPEN', { fallback: true }),
      useSettingFlag('UI_FLAG_NO_ROW_CLOSED', { fallback: false }),
    ])
    await vi.waitFor(() => expect(settings.value).toEqual({ OTHER_KEY: 'x' }), POLL)

    expect(open!.value).toBe(true)
    expect(closed!.value).toBe(false)
  })

  it('falls back OPEN / CLOSED per caller once the fetch has failed', async () => {
    api.routes({ '/api/settings/public': () => { throw new Error('settings endpoint down') } })

    const { unavailable, result: [open, closed] } = read(() => [
      useSettingFlag('UI_FLAG_FAIL_OPEN_PROBE', { fallback: true }),
      useSettingFlag('UI_FLAG_FAIL_CLOSED_PROBE', { fallback: false }),
    ])
    await vi.waitFor(() => expect(unavailable.value).toBe(true), POLL)

    expect(open!.value).toBe(true)
    expect(closed!.value).toBe(false)
  })

  it('reads every flag and value off ONE request', async () => {
    serveSettings({ GIFT_CARDS_ENABLED: 'True', BUSINESS_HOURS: '{}' })

    const { result: [flag, value, missing] } = read(() => [
      useSettingFlag('GIFT_CARDS_ENABLED', { fallback: false }),
      useSettingValue('BUSINESS_HOURS'),
      useSettingValue('STORE_OFFICES'),
    ])
    await vi.waitFor(() => expect(value!.value).toBe('{}'), POLL)

    expect(flag!.value).toBe(true)
    expect(missing!.value).toBe('')
    expect(api.callsTo('/api/settings/public')).toHaveLength(1)
  })
})
