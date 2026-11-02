import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * What a link or a record setting can point at that matches what the staff
 * member typed, for the editor's pickers: Django's `GET builder/link-search`
 * (`{ results: [{ kind, id, label, slug, active, source? }] }`, grouped by
 * kind, the kinds `kinds` names, in that order). Only what a link may point
 * at, the rule a publish checks references with. The labels are in the
 * editor's language, else the store's default.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const query = await getValidatedQuery(event, zApiV1BuilderLinkSearchRetrieveQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/link-search`, {
      method: 'GET',
      headers,
      query: { ...query, locale: requestLocale(event) },
    })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderLinkSearchRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
