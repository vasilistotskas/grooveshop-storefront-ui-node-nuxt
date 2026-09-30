import { describe, expect, it } from 'vitest'
import { useBackendFetch } from '~~/server/utils/backendFetch'
import { backend, createTestEvent, setRuntimeConfig, withEvent } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

const API = 'http://backend.test/api/v1'

/** Call the backend through the named instance, inside a request (or none), and return what reached the wire. */
async function send(input: string | URL | Request = `${API}/contact`, options: Record<string, unknown> = {}, req?: TestRequest) {
  backend.reply({ ok: true })
  const call = () => useBackendFetch()(input as string, options)
  await (req ? withEvent(createTestEvent(req), call) : call())
  return backend.lastRequest.headers
}

describe('useBackendFetch', () => {
  it('resolves the tenant from the request host, never a spoofed X-Forwarded-Host', async () => {
    const headers = await send(undefined, {}, { host: 'webside.gr', headers: { 'x-forwarded-host': 'evil.example' } })

    expect(headers.get('x-forwarded-host')).toBe('webside.gr')
  })

  it('always tells Django the request was https, so SECURE_SSL_REDIRECT does not 301 out of the cluster', async () => {
    expect((await send(undefined, {}, {})).get('x-forwarded-proto')).toBe('https')
  })

  it('sends the page locale, or the default one', async () => {
    expect((await send(undefined, {}, { context: { locale: 'en' } })).get('x-language')).toBe('en')
    expect((await send(undefined, {}, {})).get('x-language')).toBe('el')
  })

  it('merges in who the visitor is (clientIdentityHeaders)', async () => {
    const headers = await send(undefined, {}, { headers: { 'cf-connecting-ip': '203.0.113.9', 'x-origin-verify': 'edge-secret', 'user-agent': 'UA/1' } })

    expect(headers.get('x-real-ip')).toBe('203.0.113.9')
    expect(headers.get('x-origin-verify')).toBe('edge-secret')
    expect(headers.get('user-agent')).toBe('UA/1')
  })

  it('relays the request correlation id', async () => {
    expect((await send(undefined, {}, { headers: { 'x-correlation-id': 'req-42' } })).get('x-correlation-id')).toBe('req-42')
  })

  it('never overwrites a header the caller set', async () => {
    const headers = await send(undefined, {
      headers: {
        'X-Forwarded-Proto': 'http',
        'X-Forwarded-Host': 'explicit.test',
        'X-Language': 'de',
        'X-Correlation-ID': 'caller',
        'X-Real-IP': '198.51.100.1',
      },
    }, { headers: { 'x-correlation-id': 'req-42', 'cf-connecting-ip': '203.0.113.9' }, context: { locale: 'en' } })

    expect(Object.fromEntries(['x-forwarded-proto', 'x-forwarded-host', 'x-language', 'x-correlation-id', 'x-real-ip'].map(name => [name, headers.get(name)]))).toEqual({
      'x-forwarded-proto': 'http',
      'x-forwarded-host': 'explicit.test',
      'x-language': 'de',
      'x-correlation-id': 'caller',
      'x-real-ip': '198.51.100.1',
    })
  })

  it('outside a request, names the platform Django host and sends no visitor identity', async () => {
    const headers = await send()

    expect(headers.get('x-forwarded-host')).toBe('platform.test')
    expect(headers.get('x-language')).toBe('el')
    expect(headers.has('x-real-ip')).toBe(false)
  })

  it.each([
    ['a URL object', () => new URL(`${API}/contact`)],
    ['a Request', () => new Request(`${API}/contact`)],
  ])('recognises an internal origin given as %s', async (_label, input) => {
    expect((await send(input(), {}, { host: 'webside.gr' })).get('x-forwarded-host')).toBe('webside.gr')
  })

  it('leaves a request to any other origin untouched', async () => {
    const headers = await send('https://api.stripe.test/v1/charges', {}, { host: 'webside.gr', headers: { 'cf-connecting-ip': '203.0.113.9' } })

    expect([...headers.keys()]).toEqual([])
  })

  it('reads the internal origins per request, not once at first use', async () => {
    await send()
    setRuntimeConfig({ apiBaseUrl: 'http://moved.test/api/v1', djangoUrl: 'http://moved.test' })

    expect((await send('http://moved.test/api/v1/contact', {}, { host: 'webside.gr' })).get('x-forwarded-host')).toBe('webside.gr')
  })
})
