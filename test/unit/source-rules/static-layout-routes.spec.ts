import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isCustomPageSlug } from '~~/shared/utils/customPageSlug'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'
import {
  APP,
  COMPONENTS,
  REPO,
  appLabel,
  callsIn,
  sfcTemplate,
  staticText,
  vueFiles,
  walkElements,
} from '../../helpers/sourceText'

/**
 * Two hand-kept lists that decide what a custom page is, read against the
 * files they describe.
 *
 * `STATIC_LAYOUT_ROUTES` names the page types the static routes render:
 * the catch-all refuses them (it served the home layout at `/home`), and
 * the sitemap lists a published layout at `/<pageType>` only when it is
 * not one of them. A page that starts rendering a new page type, or stops,
 * fails here rather than reappearing as a duplicate URL.
 *
 * `isCustomPageSlug`'s reserved segments must cover every first path
 * segment the storefront answers itself, or a store could publish a
 * layout whose URL renders something else, and the sitemap would list it.
 */
const PAGES = resolve(APP, 'pages')
const SERVER = resolve(REPO, 'server')
const PUBLIC = resolve(REPO, 'public')

const isDynamic = (name: string) => name.startsWith('[')
const routeName = (file: string) => file.replace(/(\.(get|post|put|patch|delete))?\.(ts|vue)$/, '')

/** First path segments served by something other than the catch-all. */
function servedSegments(): string[] {
  const pages = readdirSync(PAGES, { withFileTypes: true })
    .map(entry => routeName(entry.name))
    .filter(name => !isDynamic(name) && name !== 'index')
  const serverRoutes = readdirSync(resolve(SERVER, 'routes')).map(routeName)
  const publicEntries = readdirSync(PUBLIC)
  return [...new Set([...pages, ...serverRoutes, 'api', ...publicEntries])].sort()
}

/** Every page type a static page renders, with the file that renders it. */
function renderedPageTypes(): Array<{ pageType: string, file: string }> {
  const out: Array<{ pageType: string, file: string }> = []
  for (const file of vueFiles(COMPONENTS)) {
    for (const { call } of callsIn(file, /^usePageConfig$/)) {
      const pageType = staticText(call.arguments[0])
      if (pageType !== undefined) out.push({ pageType, file })
    }
  }
  for (const file of vueFiles(PAGES)) {
    walkElements(sfcTemplate(file), (node) => {
      for (const prop of node.props) {
        if (prop.type === 6 && prop.name === 'page-type' && prop.value) {
          out.push({ pageType: prop.value.content, file })
        }
      }
    })
  }
  return out
}

describe('static routes and the custom pages beside them', () => {
  const segments = servedSegments()

  // A canary: the walk above reading nothing would pass every case.
  it('reads the routes from disk', () => {
    expect(segments.length).toBeGreaterThanOrEqual(25)
  })

  it.each(segments)('/%s is never a custom page', (segment) => {
    expect(isCustomPageSlug(segment)).toBe(false)
  })

  it('names every page type a static page renders, and no other', () => {
    const rendered = renderedPageTypes()
    const unknown = rendered
      .filter(({ pageType }) => !Object.hasOwn(STATIC_LAYOUT_ROUTES, pageType))
      .map(({ pageType, file }) => `${pageType} in ${appLabel(file)}`)
    expect(unknown).toEqual([])
    expect([...new Set(rendered.map(({ pageType }) => pageType))].sort())
      .toEqual(Object.keys(STATIC_LAYOUT_ROUTES).sort())
  })

  it.each(Object.entries(STATIC_LAYOUT_ROUTES))('%s is rendered by a page at %s', (_pageType, path) => {
    const page = path === '/' ? 'index' : path.slice(1)
    expect(
      existsSync(resolve(PAGES, `${page}.vue`)) || existsSync(resolve(PAGES, page, 'index.vue')),
    ).toBe(true)
  })

  // The brand pages hand their page type to one shared body, so the page
  // file is the only place that says which route renders which type.
  it('gives each brand page the page type of its own route', () => {
    const mismatched = renderedPageTypes()
      .filter(({ file }) => file.startsWith(PAGES))
      .filter(({ pageType, file }) => STATIC_LAYOUT_ROUTES[pageType as keyof typeof STATIC_LAYOUT_ROUTES] !== `/${routeName(appLabel(file).slice('pages/'.length))}`)
      .map(({ pageType, file }) => `${pageType} in ${appLabel(file)}`)
    expect(mismatched).toEqual([])
  })
})
