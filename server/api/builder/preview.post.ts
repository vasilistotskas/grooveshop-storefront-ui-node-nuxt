import { defineEventHandler, readValidatedBody } from 'nuxt/server'

/**
 * The editor's preview of working copies: each page or template the body
 * names, ready to render, and the store's menus with the section groups it
 * names in place of the published ones. Everything goes through what the
 * published reads go through (`builderPageOf`, `builderNavigationOf`), after
 * the copy is resolved for the request's language the way Django resolves
 * a release (`resolveWorkingCopy`), so the preview draws what publishing
 * would serve.
 *
 * Links follow the published store: a link to a page that is not published
 * is hidden, as it would be until that page is published too.
 *
 * Staff only (STAFF included, who may look), never cached: the answer is
 * one staff member's unsaved work.
 */
export default defineEventHandler(async (event): Promise<BuilderPreviewResponse> => {
  try {
    await requireBuilderStaff(event)
    const { documents } = await readValidatedBody(event, ZodBuilderPreviewRequest)
    const locale = requestLocale(event)
    const resolved = Object.entries(documents).map(([key, copy]) => ({
      key,
      ...parseBuilderDocumentKey(key),
      document: resolveWorkingCopy(copy, locale),
    }))

    const pages = Object.fromEntries(await Promise.all(resolved
      .filter(({ kind }) => kind === 'page' || kind === 'template')
      .map(async ({ key, document }) => [key, await builderPageOf(event, document)] as const)))

    const published = await readPublishedSummary(event)
    const groups = {
      ...published.groups,
      ...Object.fromEntries(resolved.flatMap(({ kind, name, document }) => kind === 'group' && name ? [[name, document]] : [])),
    }
    const navigation = builderNavigationOf(groups, await publishedTargets(event, published))

    event.res.headers.set('Cache-Control', 'private, no-store')
    return { pages, navigation }
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
