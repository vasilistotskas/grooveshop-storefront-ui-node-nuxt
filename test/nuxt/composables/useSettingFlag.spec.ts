import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Every flag reads off the ONE per-render settings payload, so the
// mock answers `/api/settings/public` with a whole record.
const { mockFetch, publicSettings } = vi.hoisted(() => {
  const publicSettings = { value: {} as Record<string, string>, reject: false }
  return {
    publicSettings,
    mockFetch: vi.fn((url: unknown) => {
      if (String(url).includes('/api/settings/public')) {
        return publicSettings.reject
          ? Promise.reject(new Error('settings endpoint down'))
          : Promise.resolve({ settings: publicSettings.value })
      }
      return Promise.resolve({})
    }),
  }
})
mockNuxtImport('$fetch', () => mockFetch)

const settingsCalls = () =>
  mockFetch.mock.calls.filter(call => String(call[0]).includes('/api/settings/public'))

describe('useSettingFlag / useSettingValue', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    publicSettings.value = {}
    publicSettings.reject = false
    // The payload is cached by key across the file's shared Nuxt app;
    // each test starts from an empty cache so its own record is read.
    clearNuxtData(STORE_SETTINGS_KEY)
  })

  it('parses a true value', async () => {
    publicSettings.value = { MOBILE_BOTTOM_NAV_ENABLED: 'True' }

    const flag = await runInNuxtContext(() =>
      useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', { fallback: false }))
    await flushSettingFetch()

    expect(flag.value).toBe(true)
  })

  it('parses a false value even when the fallback is true', async () => {
    publicSettings.value = { STICKY_ADD_TO_CART_ENABLED: 'False' }

    const flag = await runInNuxtContext(() =>
      useSettingFlag('STICKY_ADD_TO_CART_ENABLED', { fallback: true }))
    await flushSettingFetch()

    expect(flag.value).toBe(false)
  })

  it('accepts the shared truthiness rule (1 / yes), not only "True"', async () => {
    publicSettings.value = { A_FLAG: '1', B_FLAG: 'yes', C_FLAG: 'no' }

    const [a, b, c] = await runInNuxtContext(() => [
      useSettingFlag('A_FLAG', { fallback: false }),
      useSettingFlag('B_FLAG', { fallback: false }),
      useSettingFlag('C_FLAG', { fallback: true }),
    ])
    await flushSettingFetch()

    expect([a!.value, b!.value, c!.value]).toEqual([true, true, false])
  })

  it('applies the fallback to a key without a row', async () => {
    publicSettings.value = {}

    const [open, closed] = await runInNuxtContext(() => [
      useSettingFlag('UI_FLAG_NO_ROW_OPEN', { fallback: true }),
      useSettingFlag('UI_FLAG_NO_ROW_CLOSED', { fallback: false }),
    ])
    await flushSettingFetch()

    expect(open!.value).toBe(true)
    expect(closed!.value).toBe(false)
  })

  it('falls back OPEN / CLOSED per caller when the fetch rejects', async () => {
    publicSettings.reject = true

    const [open, closed] = await runInNuxtContext(() => [
      useSettingFlag('UI_FLAG_FAIL_OPEN_PROBE', { fallback: true }),
      useSettingFlag('UI_FLAG_FAIL_CLOSED_PROBE', { fallback: false }),
    ])
    await flushSettingFetch()

    expect(open!.value).toBe(true)
    expect(closed!.value).toBe(false)
  })

  it('reads every flag and value off ONE request', async () => {
    publicSettings.value = { GIFT_CARDS_ENABLED: 'True', BUSINESS_HOURS: '{}' }

    const [flag, value, missing] = await runInNuxtContext(() => [
      useSettingFlag('GIFT_CARDS_ENABLED', { fallback: false }),
      useSettingValue('BUSINESS_HOURS'),
      useSettingValue('STORE_OFFICES'),
    ])
    await flushSettingFetch()

    expect(flag!.value).toBe(true)
    expect(value!.value).toBe('{}')
    expect(missing!.value).toBe('')
    expect(settingsCalls()).toHaveLength(1)
  })
})

async function runInNuxtContext<T>(fn: () => T): Promise<T> {
  const nuxtApp = useNuxtApp()
  return nuxtApp.runWithContext(fn)
}

async function flushSettingFetch() {
  // useFetch resolves asynchronously; two macrotasks settle it.
  await new Promise(resolve => setTimeout(resolve, 20))
  await nextTick()
}
