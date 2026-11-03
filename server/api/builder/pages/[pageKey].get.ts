import { defineEventHandler } from 'nuxt/server'

/**
 * A published page of the store, ready to render: its document from the
 * current release (`readPublishedPage`: resolved for the page's language by
 * Django, then made safe here, cached), then everything that depends on the
 * store as it is NOW (`renderBuilderPage`): the data its sections show
 * (products, posts, categories, offers: read in as few calls as the page
 * allows, each cached briefly on its own), the addresses its links have, and
 * each section as its block type and the props its component gets
 * (`sectionProps`), so the client never holds a block definition or Zod.
 *
 * The document and the data are cached apart on purpose: a release is
 * immutable and lives minutes, while a price or a name changes any time, and
 * the page must never freeze one inside the other. This route is not cached
 * itself, and `edge-cache.ts` marks it `private, no-store` like every `/api`
 * GET that states no caching of its own.
 *
 * `{ page: null }` is Django's `page_not_published`, the normal state of a
 * page type the store has not built (see `readPublishedPage`).
 */
export default defineEventHandler(async (event): Promise<BuilderPageResponse> => {
  try {
    const { pageKey } = await parseRouterParams(event, ZodBuilderPageParams)
    // The page's language, clamped to the store's by `server/middleware/1.locale.ts`.
    const document = await readPublishedPage(requestTenantHost(event), requestLocale(event), pageKey, storeFeatureOf(event))
    return { page: document ? await renderBuilderPage(event, document) : null }
  }
  catch (error) {
    return handleError(event, error)
  }
})
