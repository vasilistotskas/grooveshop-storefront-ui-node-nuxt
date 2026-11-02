import { LEGAL_ROUTE_SLUGS } from '../utils/legalPages.ts'
import { isCustomPageSlug } from '../utils/customPageSlug.ts'
import { isStaticLayoutPageType } from '../utils/staticLayoutRoutes.ts'
import { splitLocale } from '../i18n/localeFromPath.ts'
import { LINK_ROUTES } from '../constants/builder'
import type { BuilderLink } from '../types/builder'

/** The largest id a record has (a 32-bit primary key), as the catalogue states it. */
const MAX_RECORD_ID = 2_147_483_647

export type LegacyLinkResult = { link: BuilderLink } | { error: string }

/** The id in `digits`, or `undefined` when it is not a record id. */
function recordId(digits: string): number | undefined {
  const id = Number(digits)
  return Number.isSafeInteger(id) && id >= 1 && id <= MAX_RECORD_ID ? id : undefined
}

const refPatterns: ReadonlyArray<readonly [RegExp, 'product' | 'category' | 'blogPost' | 'blogCategory']> = [
  [/^\/products\/category\/(\d+)(?:\/.+)?$/, 'category'],
  [/^\/products\/(\d+)(?:\/[^/]+)?$/, 'product'],
  [/^\/blog\/post\/(\d+)(?:\/.+)?$/, 'blogPost'],
  [/^\/blog\/category\/(\d+)(?:\/.+)?$/, 'blogCategory'],
]

/**
 * A link as `page_config` stored it, a typed path or URL, read as what it
 * names: an external `https://` URL, a fixed route, or a record (a product, a
 * category, a blog post or category, a page, a content page). The locale
 * prefix of a path is ignored: the link follows the visitor's language when
 * the page is read.
 *
 * A path that is none of these is an error, never a silent copy: an internal
 * path kept as text goes stale on the day its record is renamed, which is
 * what a link by record exists to prevent. A path that names a record or a
 * page that does not exist is not caught here (this is pure); Django refuses
 * the document for it when the import checks its references.
 */
export function parseLegacyLink(raw: string): LegacyLinkResult {
  const value = raw.trim()
  if (value.startsWith('https://')) return { link: { href: value } }
  if (!value.startsWith('/')) return { error: `"${raw}" is neither an https:// URL nor a path of the store` }
  if (/[?#]/.test(value)) return { error: `"${raw}" has a query string or an anchor, which a link by record cannot keep` }

  const { route } = splitLocale(value)
  if ((LINK_ROUTES as readonly string[]).includes(route)) return { link: { route: route as (typeof LINK_ROUTES)[number] } }

  for (const [pattern, kind] of refPatterns) {
    const digits = pattern.exec(route)?.[1]
    if (digits === undefined) continue
    const id = recordId(digits)
    return id === undefined ? { error: `"${raw}" names a ${kind} id that no record has` } : { link: { ref: { kind, id } } }
  }

  const info = /^\/info\/([-a-zA-Z0-9_]{1,64})$/.exec(route)?.[1]
  if (info) return { link: { ref: { kind: 'contentPage', id: info } } }

  const segment = /^\/([^/]+)$/.exec(route)?.[1]
  if (segment) {
    const legal = (LEGAL_ROUTE_SLUGS as Record<string, string>)[segment]
    if (legal) return { link: { ref: { kind: 'contentPage', id: legal } } }
    if (isStaticLayoutPageType(segment) || isCustomPageSlug(segment)) return { link: { ref: { kind: 'page', id: segment } } }
  }
  return { error: `"${raw}" is not a route of the store that a link can name` }
}
