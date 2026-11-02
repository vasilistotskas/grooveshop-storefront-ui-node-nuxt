import { describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/builder/preview.post'
import type { BlockDefinition } from '~~/shared/types/builder'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'
import { signInBuilderStaff } from '~~/test/helpers/builderStaff'

/**
 * The editor's preview of working copies, drawn through what the published
 * reads go through. It needs real blocks (a hero and the menus), so the REAL
 * blocks stand in for `#builder-blocks`, as in `navigation.get.spec.ts`.
 */
vi.mock('#builder-blocks', async () => ({
  default: (await Promise.all(Object.values(import.meta.glob<{ default: BlockDefinition }>('../../../../../app/blocks/*.block.ts')).map(load => load())))
    .map(({ default: block }) => block),
}))

const route = '/api/builder/preview'

const HOME = {
  draft: {
    sections: {
      hero: { type: 'hero_banner@1', settings: { heading: 'Καλώς ήρθατε', ctaText: 'Δείτε', ctaLink: { ref: { kind: 'page', id: 'about' } } } },
      hidden: { type: 'hero_banner@1', disabled: true, settings: { heading: 'Κρυφό' } },
    },
    order: ['hero', 'hidden'],
  },
  i18n: { en: { hero: { '/heading': 'Welcome' } } },
}

const menu = (label: string) => ({
  draft: {
    sections: {
      menu: {
        type: 'header_menu@1',
        settings: {},
        blocks: { link: { type: 'nav_link@1', settings: { label, route: '/products' } } },
        blockOrder: ['link'],
      },
    },
    order: ['menu'],
  },
  i18n: {},
})

const PUBLISHED_FOOTER = {
  key: 'group:footer',
  version: 1,
  sections: {
    menu: {
      type: 'footer_menu@1',
      settings: {},
      blocks: { shop: { type: 'footer_column@1', settings: { label: 'Κατάστημα' }, blocks: { all: { type: 'nav_link@1', settings: { label: 'Όλα', route: '/products' } } }, blockOrder: ['all'] } },
      blockOrder: ['shop'],
    },
  },
  order: ['menu'],
}

/** The published store: its header says "Published", its footer one column; `pages` are the pages it holds. */
function serve(pages: string[] = []) {
  backend.reply(({ path }) => {
    if (path.endsWith('/builder/published')) {
      return {
        release: 4,
        groups: { header: { ...menu('Published').draft, key: 'group:header', version: 1 }, footer: PUBLISHED_FOOTER },
        pages: pages.map(key => ({ key, kind: 'page', updatedAt: '2026-11-01T10:00:00Z' })),
      }
    }
    if (path.endsWith('/content-page')) return { results: [] }
    throw new Error(`unexpected backend request: ${path}`)
  })
}

async function post(body: unknown, options: { locale?: string, signedIn?: boolean } = {}) {
  const cookie = options.signedIn === false ? undefined : await signInBuilderStaff()
  return callRoute(handler, {
    route,
    method: 'POST',
    body,
    context: { locale: options.locale ?? 'el' },
    headers: cookie ? { cookie } : {},
  })
}

describe('POST /api/builder/preview', () => {
  it('draws a working copy as the published page route draws a release: disabled sections dropped', async () => {
    const cookie = await signInBuilderStaff()
    serve(['about'])

    const response = await callRoute(handler, { route, method: 'POST', body: { documents: { 'template:home': HOME } }, context: { locale: 'el' }, headers: { cookie } })

    expect(response.status).toBe(200)
    expect(response.body.pages['template:home'].sections).toEqual([
      { id: 'hero', componentType: 'hero_banner', props: expect.objectContaining({ heading: 'Καλώς ήρθατε', ctaText: 'Δείτε', ctaLink: '/about' }) },
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('resolves the copy for the request\'s language', async () => {
    const cookie = await signInBuilderStaff()
    serve()

    const { body } = await callRoute(handler, { route, method: 'POST', body: { documents: { 'template:home': HOME } }, context: { locale: 'en' }, headers: { cookie } })

    expect(body.pages['template:home'].sections[0].props.heading).toBe('Welcome')
  })

  it('hides a link to a page the store has not published, as publishing would', async () => {
    const cookie = await signInBuilderStaff()
    serve([])

    const { body } = await callRoute(handler, { route, method: 'POST', body: { documents: { 'template:home': HOME } }, context: { locale: 'el' }, headers: { cookie } })

    expect(body.pages['template:home'].sections[0].props).not.toHaveProperty('ctaLink')
  })

  it('draws the menus with the groups it is given, and the published ones for the rest', async () => {
    const cookie = await signInBuilderStaff()
    serve()

    const { body } = await callRoute(handler, { route, method: 'POST', body: { documents: { 'group:header': menu('Πρόχειρο') } }, context: { locale: 'el' }, headers: { cookie } })

    expect(body.pages).toEqual({})
    expect(body.navigation).toEqual({
      header: [{ label: 'Πρόχειρο', to: '/products' }],
      footer: [{ label: 'Κατάστημα', children: [{ label: 'Όλα', to: '/products' }] }],
    })
  })

  it('answers only a staff session', async () => {
    const response = await post({ documents: {} }, { signedIn: false })

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(backend.requests).toHaveLength(0)
  })

  it.each([
    ['a key that is not a document', { documents: { nope: HOME } }],
    ['more documents than a page and its groups', { documents: Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(name => [`page:${name}`, HOME])) }],
    ['a copy that is not a working copy', { documents: { 'template:home': { draft: { sections: {} } } } }],
  ])('refuses %s', async (_case, body) => {
    const response = await post(body)

    expect(response.status).toBe(400)
  })

  it('fails when the published store cannot be read, never drawing menus that would hide the wrong links', async () => {
    const cookie = await signInBuilderStaff()
    backend.reply(() => jsonResponse({ detail: 'down' }, 503))

    const response = await callRoute(handler, { route, method: 'POST', body: { documents: { 'group:header': menu('x') } }, context: { locale: 'el' }, headers: { cookie } })

    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
