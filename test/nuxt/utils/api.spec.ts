import { afterEach, describe, expect, it } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { getRequestHeaders } from 'h3'
import type { SupportedLocale } from '~~/i18n/locales'

/**
 * The page-locale hook every app fetcher uses (`pageLocaleHeader`,
 * app/utils/api.ts). Django answers in the `X-Language` it is sent and
 * the Nitro caches key on it, so every same-origin `/api` call must
 * carry the locale of the page the visitor is on.
 *
 * The endpoint echoes the header it received, so these tests go through
 * the real transports — the provided `$api` instance, `useApi`
 * (createUseFetch) and `useRequestApi` — not a mock of them.
 */
// The test transport keeps header-name case, so look the name up
// case-insensitively, as HTTP does.
registerEndpoint('/api/_test/locale-echo', (event) => {
  const headers = getRequestHeaders(event)
  const name = Object.keys(headers).find(key => key.toLowerCase() === 'x-language')
  return { language: name ? headers[name] : null }
})

function setLocale(code: SupportedLocale) {
  useNuxtApp().$i18n.locale.value = code
}

afterEach(() => {
  setLocale('el')
})

describe('pageLocaleHeader', () => {
  function headersAfter(request: string, locale: SupportedLocale) {
    setLocale(locale)
    const options = { headers: new Headers() }
    pageLocaleHeader(useNuxtApp())({ request, options } as any)
    return options.headers
  }

  it('states the page locale on a same-origin /api request', () => {
    expect(headersAfter('/api/products/1', 'el').get('X-Language')).toBe('el')
    expect(headersAfter('/api/products/1', 'en').get('X-Language')).toBe('en')
  })

  it('leaves any other request alone', () => {
    expect(headersAfter('https://example.com/api/x', 'en').has('X-Language')).toBe(false)
    expect(headersAfter('/_nuxt/entry.js', 'en').has('X-Language')).toBe(false)
  })
})

describe('the app fetchers send it', () => {
  it('$api (the provided instance)', async () => {
    setLocale('en')
    expect(await useNuxtApp().$api('/api/_test/locale-echo')).toEqual({ language: 'en' })

    // Read at request time: a language switch applies to the next call.
    setLocale('el')
    expect(await useNuxtApp().$api('/api/_test/locale-echo')).toEqual({ language: 'el' })
  })

  it('$api (the auto-imported accessor)', async () => {
    setLocale('en')
    expect(await $api('/api/_test/locale-echo')).toEqual({ language: 'en' })
  })

  it('useApi, keeping a caller\'s own onRequest hook', async () => {
    setLocale('en')
    let callerHookRan = false
    const { data } = await useApi('/api/_test/locale-echo', {
      key: 'locale-echo-useApi',
      onRequest: () => {
        callerHookRan = true
      },
    })

    expect(data.value).toEqual({ language: 'en' })
    expect(callerHookRan).toBe(true)
  })

  it('useLazyApi', async () => {
    setLocale('en')
    const { data, execute } = useLazyApi('/api/_test/locale-echo', {
      key: 'locale-echo-useLazyApi',
      immediate: false,
    })
    await execute()

    expect(data.value).toEqual({ language: 'en' })
  })

  it('useRequestApi', async () => {
    setLocale('en')
    const requestApi = useRequestApi()

    expect(await requestApi('/api/_test/locale-echo')).toEqual({ language: 'en' })
  })
})
