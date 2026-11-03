import { splitLocale } from '~~/shared/i18n/localeFromPath'
import { isStaticLayoutPageType, STATIC_LAYOUT_ROUTES } from './staticLayoutRoutes'
import { BUILDER_CANVAS_QUERY, BUILDER_EDITOR_ROUTE, BUILDER_SHARE_PAGE_QUERY, BUILDER_SHARE_ROUTE } from '../constants/builderEditor'
import type { BuilderDocumentKind } from '../types/builder'
import type { BuilderSurface } from '../types/builderEditor'

/**
 * Whether a path is the page editor's own page, in any language
 * (`/_builder`, `/en/_builder`). The editor is not the store: it is drawn
 * in the platform's look, so the store's design, theme tokens and font
 * faces stay off it (`app/plugins/design.ts`, `app/plugins/tenant-theme.ts`,
 * `server/plugins/tenant-theme.ts`, `server/plugins/tenant-fonts.ts`). The
 * store itself is what its preview frame shows.
 */
export function isBuilderEditorPath(path: string): boolean {
  return splitLocale(path.split('?')[0] ?? '').route === BUILDER_EDITOR_ROUTE
}

/** Whether a path is a share-preview link, in any language (`/en/_builder/preview/<token>`). */
export function isBuilderSharePath(path: string): boolean {
  return splitLocale(path.split('?')[0] ?? '').route.startsWith(`${BUILDER_SHARE_ROUTE}/`)
}

/** The route of a share link for `token` showing the page `page` (a slug), without a locale prefix. */
export function builderSharePath(token: string, page: string): string {
  return `${BUILDER_SHARE_ROUTE}/${token}?${new URLSearchParams({ [BUILDER_SHARE_PAGE_QUERY]: page })}`
}

/**
 * A document key's kind and name: `group:header` is a `group` named
 * `header`; `theme`, the one document of its kind, has no name. The key is
 * one `BUILDER_DOCUMENT_KEY_PATTERN` admits.
 */
export function parseBuilderDocumentKey(key: string): { kind: BuilderDocumentKind, name?: string } {
  const [kind, name] = key.split(':', 2) as [BuilderDocumentKind, string | undefined]
  return name === undefined ? { kind } : { kind, name }
}

/** Whether a document key is a page the store draws on its own: a page it made, or a template. */
export function builderPageKind(key: string): boolean {
  const { kind } = parseBuilderDocumentKey(key)
  return kind === 'page' || kind === 'template'
}

/** The key of a document of `kind` named `name`: `builderDocumentKey('group', 'header')` is `group:header`. */
export function builderDocumentKey(kind: Exclude<BuilderDocumentKind, 'theme'>, name: string): string {
  return `${kind}:${name}`
}

/**
 * Where the store draws a page document, the address its preview loads: a
 * template at the route of its page type (`STATIC_LAYOUT_ROUTES`), a page the
 * store made at its own slug. `undefined` for a document no page draws
 * alone (the theme, a section group, a template of no route).
 */
export function builderDocumentPath(key: string): string | undefined {
  const { kind, name } = parseBuilderDocumentKey(key)
  if (!name) return undefined
  if (kind === 'template') return isStaticLayoutPageType(name) ? STATIC_LAYOUT_ROUTES[name].path : undefined
  return kind === 'page' ? `/${name}` : undefined
}

/**
 * The page document of `keys` a store address draws, in any language: the
 * template of the route's page type (the first of a route several share),
 * else a page the store made at that slug; `undefined` for an address no
 * document of `keys` draws (a product, the cart).
 */
export function builderDocumentAt(path: string, keys: readonly string[]): string | undefined {
  const route = splitLocale(path.split(/[?#]/, 1)[0] ?? '').route.replace(/(.)\/+$/, '$1')
  return keys.find(key => parseBuilderDocumentKey(key).kind === 'template' && builderDocumentPath(key) === route)
    ?? keys.find(key => parseBuilderDocumentKey(key).kind === 'page' && builderDocumentPath(key) === route)
}

/** The page builder surface a path (with its query) is, or `null` for a page of the store (`BuilderSurface`). */
export function builderSurfaceOf(path: string): BuilderSurface | null {
  if (isBuilderEditorPath(path)) return 'editor'
  if (isBuilderSharePath(path)) return 'share'
  return hasBuilderCanvasMarker(path) ? 'canvas' : null
}

/** Whether a request path (with its query) asks for a store page as the editor's preview (`BUILDER_CANVAS_QUERY`). */
export function hasBuilderCanvasMarker(path: string): boolean {
  const query = path.split('#', 1)[0]!.split('?').slice(1).join('?')
  return new URLSearchParams(query).has(BUILDER_CANVAS_QUERY)
}
