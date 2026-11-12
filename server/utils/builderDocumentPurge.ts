/** Where the purge looks for keys (`prefix`, relative to the cache mount) and which of them it takes (`accepts`; every one under the prefix when absent). */
export interface PurgeMatcher {
  prefix: string
  accepts?: (key: string) => boolean
}

/** Where Nitro keeps the rendered pages (`routes`, the unnamed cached function `_`). */
const PAGE_KEY_PREFIX = 'nitro:routes:_:'

/**
 * The first segment of the key Nitro stores a rendered page under: the
 * pathname with every non-word character removed, cut to 16 characters, and
 * `index` for the site root and for a path that has none left (nitropack
 * `runtime/internal/cache.mjs`). The rest of the key is the hash of the path
 * and the vary headers (`index.il7asoJjJE:host.…`).
 */
function pageSegment(path: string): string {
  return path.replace(/\W/g, '').slice(0, 16) || 'index'
}

/** The segment a stored page key starts with, without its hash. */
const segmentOfKey = (key: string): string | undefined => key.split(':')[3]?.split('.')[0]

/**
 * The cached reads of a page's RECORDS (`server/utils/builderData/loaders.ts`,
 * `builderLinks.ts`), by the name Nitro stores each cached function under:
 * - `builderDataProduct`, `builderDataCategory`, `builderDataBlogPost`,
 *   `builderDataBlogCategory`, `builderDataPromotion`: the records and lists
 *   a page shows, which are what changed;
 * - `builderDataSlug`: the slugs a page's links are answered at, which a
 *   renamed record changes.
 * Left out: `builderDataMedia` (an image changes through the media library,
 * whose purge is the `builder` surface's, never through a record) and
 * `builderDataTargets` (the published pages, which only a release changes).
 */
const RECORD_DATA_FUNCTIONS = [
  'builderDataProduct',
  'builderDataCategory',
  'builderDataBlogPost',
  'builderDataBlogCategory',
  'builderDataPromotion',
  'builderDataSlug',
] as const

/**
 * The record data to drop BEFORE the pages of `documents` are purged. Django
 * names a page or template document in a purge because a record it shows
 * changed (`builder.data_purge`), so the data caches the page reads are as
 * stale as the page: purging only the page let the next render read the old
 * list from a 60s data cache and store it again for the page's 5 minutes.
 * Dropped first, in the same request, a render after the purge reads Django.
 *
 * Only a page or template document reads records: a section group and the
 * theme do not, so a purge of those alone drops no data. Scoped to the store
 * by the caller (`host`), like the pages.
 *
 * What it cannot close: a page render already in flight when the purge
 * lands read the old records, and the page it stores after the purge is an
 * ordinary route-cache entry. It is served as fresh for the route's `swr`
 * lifetime (`SWR_ROUTE_RULES`, `SWR_ROUTE_PATTERN_RULES`,
 * `CUSTOM_PAGE_SWR_TTL` and the brand pages' 3600 s: 300 to 3600 s), then
 * once more while Nitro re-renders it (no `staleMaxAge`), until the next
 * record change purges it or that re-render replaces it. The 60 s data TTL
 * bounds the record-data entries only, not that page.
 */
export function builderRecordDataMatchers(documents: readonly string[]): PurgeMatcher[] {
  return documents.some(builderPageKind)
    ? RECORD_DATA_FUNCTIONS.map(name => ({ prefix: `nitro:functions:${name}:` }))
    : []
}

/**
 * What a change to builder documents must purge: the rendered pages that
 * draw them, and the chrome's menus when a section group changed. Django
 * names the documents (`template:home`, `page:summer-sale`, `group:header`,
 * `theme`); the storefront knows its own routes, so it alone turns a
 * document into keys (`builderDocumentPath`, every locale's prefix).
 *
 * Takes more, never less: a document that no page draws alone (a section
 * group, the theme, a template of no route) is drawn by every page, so it
 * purges them all. A page's segment is cut to 16 characters, so two long
 * paths may share one; both go. The purge is scoped to the store by its
 * caller (`host`), so none of this reaches another store.
 */
export function builderDocumentMatchers(documents: readonly string[]): PurgeMatcher[] {
  const paths = documents.map(builderDocumentPath)
  const matchers: PurgeMatcher[] = []
  if (documents.some(key => parseBuilderDocumentKey(key).kind === 'group')) {
    matchers.push({ prefix: 'nitro:handlers:builderChrome' })
  }
  if (paths.includes(undefined)) {
    return [...matchers, { prefix: PAGE_KEY_PREFIX }]
  }
  const segments = new Set(paths.flatMap(path => withLocalePrefixes(path!)).map(pageSegment))
  if (segments.size > 0) {
    matchers.push({ prefix: PAGE_KEY_PREFIX, accepts: key => segments.has(segmentOfKey(key) ?? '') })
  }
  return matchers
}
