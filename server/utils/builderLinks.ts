import { useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * Everything `resolveLinks` needs for `refs`, and nothing more: the slugs of
 * the records named by id (one call to Django), and the published pages only
 * when a link names a page or a content page. A read that fails fails the
 * page, which is then not cached, instead of answering links that hide
 * what is merely unreadable.
 */
export async function readLinkTargets(event: RequestEvent, refs: readonly BuilderLinkRef[]): Promise<LinkTargets> {
  const namesPublished = refs.some(({ kind }) => kind === 'page' || kind === 'contentPage')
  return {
    slugs: await readLinkSlugs(event, refs),
    published: namesPublished
      ? await publishedTargets(event, await readPublishedSummary(event))
      : { pages: new Set(), contentPages: new Set() },
  }
}

/**
 * The slugs of the records `refs` name, in ONE call to Django
 * (`GET builder/link-targets`); no call at all when no link names a record by
 * id. A slug does not vary by language, so the call carries none. Django
 * answers at most `LINK_TARGETS_MAX_IDS` ids of a kind, so a page naming more
 * makes one call per that many. A record Django does not know is simply absent.
 */
async function readLinkSlugs(
  event: RequestEvent,
  refs: readonly BuilderLinkRef[],
): Promise<LinkTargets['slugs']> {
  const wanted: Record<LinkSlugKind, number[]> = { product: [], category: [], blogPost: [], blogCategory: [] }
  for (const { kind, id } of refs) {
    if (isLinkSlugKind(kind) && typeof id === 'number') wanted[kind].push(id)
  }
  const calls = Math.max(...LINK_SLUG_KINDS.map(kind => Math.ceil(wanted[kind].length / LINK_TARGETS_MAX_IDS)))
  const answers = await Promise.all(Array.from({ length: calls }, async (_, call) => {
    const from = call * LINK_TARGETS_MAX_IDS
    const query = Object.fromEntries(LINK_SLUG_KINDS.flatMap((kind) => {
      const ids = wanted[kind].slice(from, from + LINK_TARGETS_MAX_IDS)
      return ids.length ? [[kind, ids.join(',')]] : []
    }))
    return parseDataAs(
      await useBackendFetch(event)(`${useRuntimeConfig().apiBaseUrl}/builder/link-targets`, { method: 'GET', query }),
      zApiV1BuilderLinkTargetsRetrieveResponse,
    )
  }))
  const slugsOf = (kind: LinkSlugKind): ReadonlyMap<number, string> =>
    new Map(answers.flatMap(answer => Object.entries(answer[kind] ?? {}).map(([id, slug]) => [Number(id), slug] as const)))
  return { product: slugsOf('product'), category: slugsOf('category'), blogPost: slugsOf('blogPost'), blogCategory: slugsOf('blogCategory') }
}
