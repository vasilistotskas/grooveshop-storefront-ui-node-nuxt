import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/documents/[key]/versions/[number]/restore.post'
import { signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/documents/:key/versions/:number/restore'

const restored = {
  key: 'template:home',
  kind: 'template',
  draftRevision: 6,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: { id: 7, name: 'Maria Papadopoulou' },
  publishedVersion: 2,
  hasUnpublishedChanges: true,
  draft: { sections: {}, order: [] },
  i18n: {},
  draftCatalogueHash: 'abc123',
}

const restore = (cookie: string | undefined, { number = '3', ifMatch = '5' } = {}) => callRoute(handler, {
  route,
  url: `/api/builder/documents/template%3Ahome/versions/${number}/restore`,
  method: 'POST',
  headers: { ...(cookie && { cookie }), ...(ifMatch !== '' && { 'if-match': ifMatch }) },
})

describe('POST /api/builder/documents/<key>/versions/<number>/restore', () => {
  it('puts the version back as the draft against the revision it was asked on', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(restored)

    const response = await restore(cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(restored)
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/builder/documents/template%3Ahome/versions/3/restore',
      method: 'POST',
    })
    expect(backend.lastRequest.headers.get('if-match')).toBe('5')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it.each([
    ['no If-Match', { ifMatch: '' }],
    ['a version number that is not a number', { number: 'latest' }],
  ])('refuses %s before it asks Django', async (_case, request) => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await restore(cookie, request)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('answers the revision conflict of Django as it is', async () => {
    const cookie = await signInBuilderStaff()
    const body = { detail: 'Someone else changed this document since you opened it.', code: 'revision_conflict', currentRevision: 7 }
    backend.replyOnce(jsonResponse(body, 409))

    const response = await restore(cookie)

    expect(response.status).toBe(409)
    expect(response.body).toEqual(body)
  })

  it('refuses a request without a staff session', async () => {
    const response = await restore(undefined)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
