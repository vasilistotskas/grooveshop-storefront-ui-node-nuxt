import { describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/builder/preview.post'
import type { BlockDefinition } from '~~/shared/types/builder'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'

/**
 * The editor's preview of working copies: Django resolves them in place of
 * the release (`POST builder/preview/resolve`), and the storefront draws the
 * answer through what the published reads go through. It needs real blocks
 * (a hero and the menus), so the REAL blocks stand in for `#builder-blocks`,
 * as in `navigation.get.spec.ts`.
 */
vi.mock('#builder-blocks', async () => ({
  default: (await Promise.all(Object.values(import.meta.glob<{ default: BlockDefinition }>('../../../../../app/blocks/*.block.ts')).map(load => load())))
    .map(({ default: block }) => block),
}))

const route = '/api/builder/preview'
const API = 'http://backend.test/api/v1'

const COPY = { draft: { sections: {}, order: [] }, i18n: {} }

/** What Django resolved: the page the copy stands for, and the store's groups with the header copy in place. */
const RESOLVED = {
  release: 4,
  locale: 'el',
  theme: null,
  page: {
    key: 'template:home',
    version: 0,
    sections: {
      hero: { type: 'hero_banner@1', settings: { heading: 'Καλώς ήρθατε', ctaText: 'Δείτε', ctaLink: { ref: { kind: 'page', id: 'about' } } } },
    },
    order: ['hero'],
  },
  groups: {
    header: {
      key: 'group:header',
      version: 0,
      sections: {
        menu: {
          type: 'header_menu@1',
          settings: {},
          blocks: { link: { type: 'nav_link@1', settings: { label: 'Πρόχειρο', route: '/products' } } },
          blockOrder: ['link'],
        },
      },
      order: ['menu'],
    },
  },
}

/** Django: the resolve, the release's outline (`pages`: the pages it holds) and the content pages. */
function serve(options: { pages?: string[], resolve?: () => unknown } = {}) {
  const { pages = [], resolve = () => RESOLVED } = options
  backend.reply(({ path }) => {
    if (path.endsWith('/builder/preview/resolve')) return resolve()
    if (path.endsWith('/builder/published')) {
      return { release: 4, groups: {}, pages: pages.map(key => ({ key, kind: 'page', updatedAt: '2026-11-01T10:00:00Z' })) }
    }
    if (path.endsWith('/content-page')) return { results: [] }
    throw new Error(`unexpected backend request: ${path}`)
  })
}

async function post(body: unknown, options: { locale?: string, signedIn?: boolean, pages?: string[], resolve?: () => unknown } = {}) {
  const cookie = options.signedIn === false ? undefined : await signInBuilderStaff()
  serve(options)
  return callRoute(handler, {
    route,
    method: 'POST',
    body,
    context: { locale: options.locale ?? 'el' },
    headers: cookie ? { cookie } : {},
  })
}

const HOME_AND_HEADER = { documents: { 'template:home': COPY, 'group:header': COPY } }

describe('POST /api/builder/preview', () => {
  it('asks Django to resolve the copies for the page, in the request\'s language, as the staff member', async () => {
    await post(HOME_AND_HEADER, { locale: 'en' })

    const resolve = backend.requests.find(request => request.path === `${API}/builder/preview/resolve`)!
    expect(resolve.method).toBe('POST')
    expect(resolve.body).toEqual({ pageKey: 'home', locale: 'en', documents: HOME_AND_HEADER.documents })
    expect(resolve.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(resolve.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('draws the resolved page as the published page route draws a release', async () => {
    const response = await post(HOME_AND_HEADER, { pages: ['about'] })

    expect(response.status).toBe(200)
    expect(response.body.pages['template:home'].sections).toEqual([
      { id: 'hero', componentType: 'hero_banner', props: expect.objectContaining({ heading: 'Καλώς ήρθατε', ctaText: 'Δείτε', ctaLink: '/about' }) },
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('hides a link to a page the store has not published, as publishing would', async () => {
    const { body } = await post(HOME_AND_HEADER, { pages: [] })

    expect(body.pages['template:home'].sections[0].props).not.toHaveProperty('ctaLink')
  })

  it('draws the menus of the groups Django resolved', async () => {
    const { body } = await post(HOME_AND_HEADER)

    expect(body.navigation).toEqual({ header: [{ label: 'Πρόχειρο', to: '/products' }] })
  })

  it('answers only a staff session, asking Django nothing', async () => {
    const response = await post(HOME_AND_HEADER, { signedIn: false })

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(backend.requests.some(request => request.path.endsWith('/builder/preview/resolve'))).toBe(false)
  })

  it.each([
    ['no page', { documents: { 'group:header': COPY } }],
    ['two pages', { documents: { 'template:home': COPY, 'page:about': COPY } }],
    ['a key that is not a document', { documents: { 'template:home': COPY, 'nope': COPY } }],
    ['more documents than a page and its groups', { documents: { 'template:home': COPY, 'group:header': COPY, 'group:mobile': COPY, 'group:footer': COPY, 'group:extra': COPY } }],
    ['a copy that is not a working copy', { documents: { 'template:home': { draft: { sections: {} } } } }],
  ])('refuses %s, asking Django nothing', async (_case, body) => {
    const response = await post(body)

    expect(response.status).toBe(400)
    expect(backend.requests.some(request => request.path.endsWith('/builder/preview/resolve'))).toBe(false)
  })

  it('fails as Django fails, still never cached', async () => {
    const response = await post(HOME_AND_HEADER, { resolve: () => jsonResponse({ code: 'storefront_unavailable', detail: 'down' }, 503) })

    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
