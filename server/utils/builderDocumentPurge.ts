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
