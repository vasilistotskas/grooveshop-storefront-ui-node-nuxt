import { FetchError } from 'ofetch'
import { getRouterParam, useRuntimeConfig } from 'nuxt/server'

/**
 * A published page of the store, ready to render: the page document of the
 * current release, resolved for the page's language by Django (the overlay
 * merged, disabled nodes dropped) and then made safe here (`parseDocument`:
 * every node brought to its block's current version, validated, rebuilt from
 * the parse, an unusable one left out with a warning). Each section is
 * answered as its block type and the props its component gets
 * (`sectionProps`), so the client never holds a block definition or Zod.
 *
 * `{ page: null }` is Django's `page_not_published`, the normal state of a
 * page type the store has not built: data, so it is cached (a thrown error
 * is never cached, and each render would pay a round-trip). Every other
 * failure, a 5xx or a network error included, propagates: the pages that
 * answer 404 for an unbuilt page must be able to tell it from an outage.
 *
 * Cached as the handler named `builderPage`: Django's purge after a release
 * names it (`core/cache/surfaces.py`, the `builder` surface), so renaming it
 * stops a publish reaching visitors until the TTL runs out. The release is
 * immutable and the key carries the store, the language and the store's
 * epoch, which a release moves.
 */
export default defineCachedRoute(async (event): Promise<BuilderPageResponse> => {
  const config = useRuntimeConfig()
  try {
    const { pageKey } = await parseRouterParams(event, ZodBuilderPageParams)
    // The page's language, clamped to the store's by `server/middleware/1.locale.ts`.
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/published/${pageKey}`,
      { method: 'GET', query: { locale: requestLocale(event) } },
    )
    const published = await parseDataAs(response, ZodBuilderPublished)
    const document = parseDocument(published.page, 'page')
    return {
      page: {
        ...(document.settings && { settings: document.settings }),
        sections: document.order.map((id) => {
          const node = document.sections[id]!
          return { id, componentType: parseVersionedType(node.type)!.type, props: sectionProps(node) }
        }),
      },
    }
  }
  catch (error) {
    if (error instanceof FetchError && error.statusCode === 404 && isNotPublished(error.data)) {
      return { page: null }
    }
    return handleError(event, error)
  }
}, {
  name: 'builderPage',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, `builder:${getRouterParam(event, 'pageKey', { decode: true })}`),
})

/** Django's own 404 for an unbuilt page, not any other not-found. */
function isNotPublished(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'code' in body && body.code === 'page_not_published'
}
