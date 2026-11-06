import { describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/builder/shared/[token].get'
import type { BlockDefinition } from '~~/shared/types/builder'
import { makeResolvedAsset } from '~~/test/fixtures/media'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

/**
 * A share link opened: the drafts frozen in it, drawn as the preview of the
 * editor draws them, by a route that is public (the token is the credential),
 * never cached and not for search engines. The REAL blocks stand in for
 * `#builder-blocks`, as in `preview.post.spec.ts`, with one more section that
 * holds an image of the media library (no real block declares one yet).
 */
vi.mock('#builder-blocks', async () => {
  const z = await import('zod')
  const { defineBlock: define } = await import('~~/shared/builder/defineBlock')
  const { builderField: field } = await import('~~/shared/builder/fields')
  const photoBand = define({
    type: 'photo_band',
    version: 1,
    kinds: ['section'],
    schema: z.object({ image: field.ref('media', { onMissing: 'empty' }) }),
  })
  return {
    default: [
      ...(await Promise.all(Object.values(import.meta.glob<{ default: BlockDefinition }>('../../../../../../app/blocks/*.block.ts')).map(load => load())))
        .map(({ default: block }) => block),
      photoBand,
    ],
  }
})

const route = '/api/builder/shared/:token'
const API = 'http://backend.test/api/v1'
const TOKEN = 'aGVsbG8td29ybGQtdG9rZW4tMTIzNDU2Nzg5MA'

const RESOLVED = {
  release: 4,
  locale: 'el',
  theme: null,
  page: {
    key: 'template:home',
    version: 0,
    sections: { hero: { type: 'hero_banner@1', settings: { heading: 'Πρόχειρο' } } },
    order: ['hero'],
  },
  groups: {},
}

function serve(opened: () => unknown = () => RESOLVED) {
  backend.reply(({ path }) => {
    if (path.includes('/builder/preview/')) return opened()
    if (path.endsWith(`/builder/preview-media/${TOKEN}`)) return { results: [makeResolvedAsset({ id: 12 })] }
    if (path.endsWith('/builder/published')) return { release: 4, locale: 'el', theme: null, groups: {}, pages: [] }
    if (path.endsWith('/content-page')) return { results: [] }
    throw new Error(`unexpected backend request: ${path}`)
  })
}

const open = (token = TOKEN, query = '?page=home', locale = 'el') => callRoute(handler, {
  route,
  url: `/api/builder/shared/${token}${query}`,
  context: { locale },
})

describe('GET /api/builder/shared/<token>', () => {
  it('opens the link at Django with no credential but the token, in the language of the request', async () => {
    serve()

    await open(TOKEN, '?page=home', 'en')

    const opened = backend.requests.find(request => request.path === `${API}/builder/preview/${TOKEN}/home`)!
    expect(opened.method).toBe('GET')
    expect(opened.query).toEqual({ locale: 'en' })
    expect(opened.headers.get('authorization')).toBeNull()
  })

  it('draws the frozen page as the preview of the editor does, under the page key of the slug', async () => {
    serve()

    const response = await open()

    expect(response.status).toBe(200)
    expect(response.body.pages['page:home'].sections).toEqual([
      { id: 'hero', componentType: 'hero_banner', props: expect.objectContaining({ heading: 'Πρόχειρο' }) },
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it.each([
    ['a token too short to be one', 'abc', '?page=home'],
    ['a page that is not a slug', TOKEN, '?page=../admin'],
    ['no page', TOKEN, ''],
  ])('refuses %s, asking Django nothing', async (_case, token, query) => {
    serve()
    const asked = backend.requests.length

    const response = await open(token, query)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('shows an image nobody has published, through the link\'s own token and with no other credential', async () => {
    serve(() => ({ ...RESOLVED, page: { ...RESOLVED.page, sections: { band: { type: 'photo_band@1', settings: { image: 12 } } }, order: ['band'] } }))

    const { body } = await open()

    const page = (body as BuilderPreviewResponse).pages['page:home']
    expect(page?.sections[0]?.props.image).toEqual({ status: 'ok', value: expect.objectContaining({ id: 12 }) })
    const read = backend.requests.find(request => request.path === `${API}/builder/preview-media/${TOKEN}`)!
    expect(read.url.searchParams.get('ids')).toBe('12')
    expect(read.headers.get('authorization')).toBeNull()
    expect(backend.requests.some(request => request.path.endsWith('/builder/media/resolve') || request.path.endsWith('/builder/media/staff-resolve'))).toBe(false)
  })

  it('answers the 404 of an expired or revoked link as it is, still private and not indexed', async () => {
    const body = { detail: 'This link has expired.', code: 'preview_link_expired' }
    serve(() => jsonResponse(body, 404))

    const response = await open()

    expect(response.status).toBe(404)
    expect(response.body).toEqual(body)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })
})
