import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((...args: any[]) => {
    void args
    return Promise.resolve({})
  }),
}))
mockNuxtImport('$fetch', () => mockFetch)

describe('useSettingFlag', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({}))
  })

  it('parses a true value from the settings endpoint', async () => {
    mockFetch.mockImplementation((...args: any[]) => {
      if (String(args[0]).includes('/api/settings/get')) {
        return Promise.resolve({ value: 'True' })
      }
      return Promise.resolve({})
    })

    const flag = await runInNuxtContext(() =>
      useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', { fallback: false }))
    await flushSettingFetch()

    expect(flag.value).toBe(true)
  })

  it('parses a false value even when the fallback is true', async () => {
    mockFetch.mockImplementation((...args: any[]) => {
      if (String(args[0]).includes('/api/settings/get')) {
        return Promise.resolve({ value: 'False' })
      }
      return Promise.resolve({})
    })

    const flag = await runInNuxtContext(() =>
      useSettingFlag('STICKY_ADD_TO_CART_ENABLED', { fallback: true }))
    await flushSettingFetch()

    expect(flag.value).toBe(false)
  })

  it('falls back OPEN when the fetch rejects', async () => {
    mockFetch.mockImplementation((...args: any[]) => {
      if (String(args[0]).includes('/api/settings/get')) {
        return Promise.reject(new Error('settings endpoint down'))
      }
      return Promise.resolve({})
    })

    // Unique key: useFetch caches by key across tests in the shared
    // nuxt app, so reusing an earlier test's key would serve its
    // cached value instead of exercising the rejection path.
    const flag = await runInNuxtContext(() =>
      useSettingFlag('UI_FLAG_FAIL_OPEN_PROBE', { fallback: true }))
    await flushSettingFetch()

    expect(flag.value).toBe(true)
  })

  it('falls back CLOSED for commercial feature gates', async () => {
    mockFetch.mockImplementation((...args: any[]) => {
      if (String(args[0]).includes('/api/settings/get')) {
        return Promise.reject(new Error('settings endpoint down'))
      }
      return Promise.resolve({})
    })

    const flag = await runInNuxtContext(() =>
      useSettingFlag('UI_FLAG_FAIL_CLOSED_PROBE', { fallback: false }))
    await flushSettingFetch()

    expect(flag.value).toBe(false)
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
