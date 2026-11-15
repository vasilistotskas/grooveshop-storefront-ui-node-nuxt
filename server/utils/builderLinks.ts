import { defineCachedFunction } from 'nitropack/runtime'
import type { RequestEvent } from 'nuxt/server'

import { dataCacheKey, readLinkSlugs } from './builderData/loaders'

/**
 * What the published pages and content pages of a store are, as lists a cache
 * can hold (`PublishedTargets` holds sets). Cached briefly under the name
 * Django's purge sweeps (`builderDataTargets`), so a link to a page that was
 * just unpublished stops leading nowhere within a minute at most.
 */
export const readPublishedTargets = defineCachedFunction(
  async (tenantHost: string, locale: string): Promise<{ pages: string[], contentPages: string[] }> => {
    const targets = await publishedTargets(tenantHost, await readPublishedSummary(tenantHost, locale))
    return { pages: [...targets.pages], contentPages: [...targets.contentPages] }
  },
  {
    name: 'builderDataTargets',
    maxAge: DATA_CACHE_SECONDS,
    swr: false,
    getKey: (tenantHost: string, locale: string) => dataCacheKey(tenantHost, locale, 'targets'),
  },
)

/**
 * Everything `resolveLinks` needs for `refs`, and nothing more: the paths the
 * store's switched-off features take away (`blockedFeaturePaths`), the slugs of
 * the records named by id (one call to Django per `LINK_TARGETS_MAX_IDS`), and
 * the published pages only when a link names a page or a content page. Each
 * read is cached for `DATA_CACHE_SECONDS` apart from the page document, so a
 * record renamed after the page was cached is linked at its new slug within
 * a minute, and a purge of the store's data reaches it at once. A read that
 * fails fails the page, which is then not cached, instead of answering links
 * that hide what is merely unreadable.
 */
export async function readLinkTargets(event: RequestEvent, refs: readonly BuilderLinkRef[]): Promise<LinkTargets> {
  const tenantHost = requestTenantHost(event)
  const locale = requestLocale(event)
  const namesPublished = refs.some(({ kind }) => kind === 'page' || kind === 'contentPage')
  const published = namesPublished ? await readPublishedTargets(tenantHost, locale) : undefined
  return {
    slugs: await linkSlugs(tenantHost, locale, refs),
    published: {
      pages: new Set(published?.pages),
      contentPages: new Set(published?.contentPages),
    },
    blocked: blockedFeaturePaths(event.context.tenant),
  }
}

/**
 * The slugs of the records `refs` name, in ONE call to Django
 * (`GET builder/link-targets`); no call at all when no link names a record by
 * id. A slug does not vary by language, so the call carries none. Django
 * answers at most `LINK_TARGETS_MAX_IDS` ids of a kind, so a page naming more
 * makes one call per that many. A record Django does not know is simply absent.
 */
async function linkSlugs(
  tenantHost: string,
  locale: string,
  refs: readonly BuilderLinkRef[],
): Promise<LinkTargets['slugs']> {
  const wanted: Record<LinkSlugKind, number[]> = { product: [], category: [], blogPost: [], blogCategory: [] }
  for (const { kind, id } of refs) {
    if (isLinkSlugKind(kind) && typeof id === 'number') wanted[kind].push(id)
  }
  const calls = Math.max(...LINK_SLUG_KINDS.map(kind => Math.ceil(wanted[kind].length / LINK_TARGETS_MAX_IDS)))
  const answers = await Promise.all(Array.from({ length: calls }, (_, call) => {
    const from = call * LINK_TARGETS_MAX_IDS
    const query = Object.fromEntries(LINK_SLUG_KINDS.flatMap((kind) => {
      // Sorted, so the same ids are the same cache entry whatever order the page names them in.
      const ids = [...new Set(wanted[kind])].sort((a, b) => a - b).slice(from, from + LINK_TARGETS_MAX_IDS)
      return ids.length ? [[kind, ids.join(',')]] : []
    }))
    return readLinkSlugs(tenantHost, locale, query)
  }))
  const slugsOf = (kind: LinkSlugKind): ReadonlyMap<number, string> =>
    new Map(answers.flatMap(answer => Object.entries(answer[kind] ?? {}).map(([id, slug]) => [Number(id), slug] as const)))
  return { product: slugsOf('product'), category: slugsOf('category'), blogPost: slugsOf('blogPost'), blogCategory: slugsOf('blogCategory') }
}
