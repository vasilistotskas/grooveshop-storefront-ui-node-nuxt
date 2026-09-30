/**
 * The attachment upload is the one route that PROXIES. Three things
 * have to stay true, and each is a bug that would not show up as an
 * error:
 *
 * 1. The body is streamed (`streamRequest: true`), never buffered or
 *    read here — buffering the whole file in this process is the
 *    entire reason this route is not written like its siblings.
 * 2. The tenant headers are set by hand: `sendProxy` needs a real
 *    `fetch`, which neither `useBackendFetch` nor the global `$fetch`
 *    patch covers, so without them Django files the upload in the
 *    PUBLIC schema.
 * 3. Django's reply reaches the browser verbatim.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/contact/attachment.post'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { backend, callHandler, callRoute, createTestEvent, jsonResponse, setRuntimeConfig } from '~~/test/helpers/nitro'

const route = '/api/contact/attachment'

function upload(bytes: number, context: Record<string, unknown> = { locale: 'en' }, headers: Record<string, string> = {}) {
  return callRoute(handler, {
    route,
    method: 'POST',
    body: Buffer.alloc(bytes, 1),
    headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(bytes), ...headers },
    context,
  })
}

describe('POST /api/contact/attachment', () => {
  it('streams the upload to the store backend without reading it first', async () => {
    // A real node request stream: h3 hands it on as a web stream only
    // under `streamRequest`; without it, `proxyRequest` reads the whole
    // body into a Buffer here first.
    const event = createTestEvent({
      url: route,
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '2048' },
    })
    event.node.req.push(Buffer.alloc(2048, 1))
    event.node.req.push(null)
    let received = 0
    backend.reply(async ({ body }) => {
      received = (await new Response(body).arrayBuffer()).byteLength
      return jsonResponse({ uuid: 'a1' }, 201)
    })

    await callHandler(handler, event)

    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/contact/attachment', method: 'POST' })
    expect(backend.lastRequest.body).toBeInstanceOf(ReadableStream)
    expect(received).toBe(2048)
  })

  it('relays the reply of Django verbatim', async () => {
    backend.reply(jsonResponse({ uuid: 'a1' }, 201))

    const response = await upload(16)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ uuid: 'a1' })
  })

  it('forwards the tenant host, the proto and the locale', async () => {
    backend.reply(jsonResponse({ uuid: 'a1' }, 201))

    await upload(16, { locale: 'en' }, { 'x-forwarded-host': 'evil.example' })

    const sent = backend.lastRequest.headers
    expect(sent.get('x-forwarded-host')).toBe('shop.test')
    // SECURE_SSL_REDIRECT would 301 in-cluster, and a 301 loses the body.
    expect(sent.get('x-forwarded-proto')).toBe('https')
    expect(sent.get('x-language')).toBe('en')
  })

  it('falls back to the default locale when the request carries none', async () => {
    backend.reply(jsonResponse({ uuid: 'a1' }, 201))

    await upload(16, {})

    expect(backend.lastRequest.headers.get('x-language')).toBe(DEFAULT_LOCALE)
  })

  it('relays a Django 400 verbatim too', async () => {
    backend.reply(jsonResponse({ file: ['Unsupported type.'] }, 400))

    const response = await upload(16)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ file: ['Unsupported type.'] })
  })

  it('accepts a declared size exactly at the ceiling and refuses one byte more before opening a stream', async () => {
    setRuntimeConfig({ contactAttachmentMaxBytes: 100 })
    backend.reply(jsonResponse({ uuid: 'a1' }, 201))

    expect((await upload(100)).status).toBe(201)
    const tooLarge = await upload(101)

    expect(tooLarge.status).toBe(413)
    expect(backend.requests).toHaveLength(1)
  })

  it('lets an undeclared size through for Django to measure', async () => {
    // `Content-Length` is a claim. A chunked body has none at all, and
    // refusing it here would break a legitimate upload; Django
    // re-derives the true size from the bytes it writes.
    setRuntimeConfig({ contactAttachmentMaxBytes: 100 })
    backend.reply(jsonResponse({ uuid: 'a1' }, 201))

    const response = await callRoute(handler, {
      route,
      method: 'POST',
      body: Buffer.alloc(500, 1),
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'transfer-encoding': 'chunked' },
    })

    expect(response.status).toBe(201)
  })
})
