import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/media/index.post'
import { makeAsset } from '~~/test/fixtures/media'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callHandler, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

/**
 * The upload PROXIES like the contact attachment does (`contact/attachment.post.spec.ts`
 * holds the streaming contract of the shared mechanism): what is specific here is the
 * staff member it acts as, the store it files into, and that no reply is ever cached.
 */
const route = '/api/builder/media'
const multipart = { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '16' }

const upload = (cookie: string | undefined) => callRoute(handler, {
  route,
  method: 'POST',
  body: Buffer.alloc(16, 1),
  headers: { ...multipart, ...(cookie ? { cookie } : {}) },
})

describe('POST /api/builder/media', () => {
  it('streams the upload to Django as the staff member, for the store, and relays the asset', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ ...makeAsset({ id: 9 }), duplicate: false }, 201))

    const response = await upload(cookie)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ id: 9, duplicate: false })
    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/builder/media', method: 'POST' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(backend.lastRequest.headers.get('x-forwarded-proto')).toBe('https')
  })

  it('fails on a Django fault and passes none of its body on', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'a stack trace' }, 500))

    const response = await upload(cookie)

    expect(response.status).toBe(500)
    expect(JSON.stringify(response.body)).not.toContain('a stack trace')
  })

  it('streams the body without reading it first', async () => {
    const cookie = await signInBuilderStaff()
    // A real node request stream: h3 hands it on as a web stream only under streamRequest.
    const event = createTestEvent({ url: route, method: 'POST', headers: { ...multipart, 'content-length': '2048', cookie } })
    event.node.req.push(Buffer.alloc(2048, 1))
    event.node.req.push(null)
    let received = 0
    backend.replyOnce(async ({ body }) => {
      received = (await new Response(body).arrayBuffer()).byteLength
      return jsonResponse({ ...makeAsset({ id: 9 }), duplicate: false }, 201)
    })

    await callHandler(handler, event)

    expect(backend.lastRequest.body).toBeInstanceOf(ReadableStream)
    expect(received).toBe(2048)
  })

  it('files the upload under the store and the staff member, whatever the client claims', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ ...makeAsset({ id: 9 }), duplicate: false }, 201))

    await callRoute(handler, {
      route,
      method: 'POST',
      body: Buffer.alloc(16, 1),
      headers: {
        ...multipart,
        'cookie': cookie,
        'x-forwarded-host': 'victim-store.example',
        'authorization': 'StaffBearer stolen-token',
        'x-language': 'xx',
      },
    })

    const sent = backend.lastRequest.headers
    expect(sent.get('x-forwarded-host')).toBe('shop.test')
    expect(sent.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(sent.get('x-language')).not.toBe('xx')
  })

  it('marks the reply private and uncached, whatever Django says about caching', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ ...makeAsset({ id: 9 }), duplicate: true }, 201, { 'Cache-Control': 'public, max-age=600' }))

    const response = await upload(cookie)

    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('relays the refusal of Django verbatim', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ file: ['Not an image.'] }, 400))

    const response = await upload(cookie)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ file: ['Not an image.'] })
  })

  it('refuses a request without a staff session, and opens no stream to Django', async () => {
    const response = await upload(undefined)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
