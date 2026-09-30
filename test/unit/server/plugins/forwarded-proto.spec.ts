/**
 * The global `$fetch` patch every raw-`$fetch` route depends on for its
 * tenant (search, reviews, variants, …): calls to an INTERNAL backend
 * origin carry the proto, the tenant's Host and the page locale.
 *
 * `$fetch` is the real ofetch the setup file installs per test, so the
 * plugin's patch lives exactly as long as the test that ran it, and what
 * reaches the network is what the backend spy records.
 */
import { describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/forwarded-proto'
import { backend, createTestEvent, runNitroPlugin, setRuntimeConfig, withEvent } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

type Fetch = (url: string, options?: { headers?: Record<string, string> }) => Promise<unknown>
const globalFetch = () => (globalThis as unknown as { $fetch: Fetch }).$fetch
const $fetch: Fetch = (url, options) => globalFetch()(url, options)

function inRequest<T>(req: TestRequest, fn: () => Promise<T>) {
  return withEvent(createTestEvent(req), fn)
}

describe('server/plugins/forwarded-proto', () => {
  it('stamps an internal backend call with the proto, the Host and the page locale', async () => {
    await runNitroPlugin(plugin)
    backend.reply({})

    await inRequest(
      { headers: { 'x-forwarded-host': 'evil.example' }, context: { locale: 'en' } },
      () => $fetch('http://backend.test/api/v1/products'),
    )

    const { headers } = backend.lastRequest
    expect(headers.get('x-forwarded-proto')).toBe('https')
    expect(headers.get('x-forwarded-host')).toBe('shop.test')
    expect(headers.get('x-language')).toBe('en')
  })

  it('treats the djangoUrl origin as internal too', async () => {
    setRuntimeConfig({ djangoUrl: 'http://django-internal.test' })
    await runNitroPlugin(plugin)
    backend.reply({})

    await inRequest({}, () => $fetch('http://django-internal.test/admin/x'))

    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('leaves calls to any other origin untouched', async () => {
    await runNitroPlugin(plugin)
    backend.reply({})

    await inRequest({ context: { locale: 'en' } }, () => $fetch('https://api.stripe.com/v1/x'))

    const { headers } = backend.lastRequest
    expect(headers.get('x-forwarded-proto')).toBeNull()
    expect(headers.get('x-forwarded-host')).toBeNull()
    expect(headers.get('x-language')).toBeNull()
  })

  it('keeps headers the caller already set', async () => {
    await runNitroPlugin(plugin)
    backend.reply({})

    await inRequest({ context: { locale: 'en' } }, () => $fetch('http://backend.test/api/v1/x', {
      headers: { 'X-Forwarded-Proto': 'http', 'X-Forwarded-Host': 'preset.test', 'X-Language': 'el' },
    }))

    const { headers } = backend.lastRequest
    expect(headers.get('x-forwarded-proto')).toBe('http')
    expect(headers.get('x-forwarded-host')).toBe('preset.test')
    expect(headers.get('x-language')).toBe('el')
  })

  it('sends no X-Language when the request has no locale', async () => {
    await runNitroPlugin(plugin)
    backend.reply({})

    await inRequest({}, () => $fetch('http://backend.test/api/v1/x'))

    expect(backend.lastRequest.headers.get('x-language')).toBeNull()
  })

  it('falls back to the platform host outside a request (startup, background revalidation)', async () => {
    await runNitroPlugin(plugin)
    backend.reply({})

    await $fetch('http://backend.test/api/v1/x')

    const { headers } = backend.lastRequest
    expect(headers.get('x-forwarded-host')).toBe('platform.test')
    expect(headers.get('x-forwarded-proto')).toBe('https')
  })

  it('does not patch $fetch when no backend origin is configured', async () => {
    setRuntimeConfig({ apiBaseUrl: '', djangoUrl: '' })
    const before = globalFetch()

    await runNitroPlugin(plugin)

    expect(globalFetch()).toBe(before)
  })
})
