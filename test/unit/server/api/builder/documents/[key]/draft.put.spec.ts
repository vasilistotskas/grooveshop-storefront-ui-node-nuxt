import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/documents/[key]/draft.put'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/documents/:key/draft'

const copy = {
  draft: { sections: { hero: { type: 'hero_banner@1', settings: { heading: 'Γεια' } } }, order: ['hero'] },
  i18n: { en: { hero: { '/heading': 'Hello' } } },
}

const saved = {
  key: 'template:home',
  kind: 'template',
  draftRevision: 5,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: { id: 7, name: 'Maria Papadopoulou' },
  publishedVersion: 2,
  hasUnpublishedChanges: true,
  draft: copy.draft,
  i18n: copy.i18n,
  draftCatalogueHash: 'abc123',
}

const save = (cookie: string | undefined, { key = 'template:home', ifMatch = '4', body = copy as unknown } = {}) => callRoute(handler, {
  route,
  url: `/api/builder/documents/${encodeURIComponent(key)}/draft`,
  method: 'PUT',
  body,
  headers: { ...(cookie && { cookie }), ...(ifMatch !== '' && { 'if-match': ifMatch }) },
})

describe('PUT /api/builder/documents/<key>/draft', () => {
  it('saves the working copy against the revision it was made on, and answers the saved document', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(saved)

    const response = await save(cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(saved)
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/builder/documents/template%3Ahome/draft',
      method: 'PUT',
      body: copy,
    })
    expect(backend.lastRequest.headers.get('if-match')).toBe('4')
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it.each([
    ['no If-Match', { ifMatch: '' }],
    ['an If-Match that is not a revision', { ifMatch: 'W/"4"' }],
    ['a document key Django would not hold', { key: 'home' }],
    ['a draft whose order misses a section', { body: { draft: { sections: copy.draft.sections, order: [] }, i18n: {} } }],
    ['a body without an overlay', { body: { draft: copy.draft } }],
  ])('refuses %s before it asks Django', async (_case, request) => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await save(cookie, request)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('refuses a request without a staff session', async () => {
    const response = await save(undefined)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it.each([
    [409, { detail: 'Someone else changed this document since you opened it.', code: 'revision_conflict', currentRevision: 6, updatedBy: { id: 9, name: 'Nikos' }, updatedAt: '2026-11-02T10:05:00+02:00' }],
    [400, { detail: 'The document is not valid.', code: 'invalid_document', errors: [{ path: '/sections/hero/settings/heading', code: 'invalid_settings', message: 'Too long.' }] }],
    [503, { detail: 'The storefront could not be reached.', code: 'storefront_unavailable' }],
  ])('answers Django\'s %i as it is, for the editor to act on', async (status, body) => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse(body, status))

    const response = await save(cookie)

    expect(response.status).toBe(status)
    expect(response.body).toEqual(body)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('never forwards an undocumented 5xx body', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'Traceback (most recent call last)' }, 500))

    const response = await save(cookie)

    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(JSON.stringify(response.body)).not.toContain('Traceback')
  })
})
