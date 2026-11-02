import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * The name of each record the stored links and record settings point at,
 * for the editor's pickers: Django's `GET builder/link-labels`
 * (`{ <kind>: { <id>: { label, active, source? } } }` for the ids asked
 * about). A record that can no longer be linked keeps its label with
 * `active: false`; one that exists nowhere is `{ label: null, active: false }`.
 * The labels are in the editor's language, else the store's default.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const query = await getValidatedQuery(event, zApiV1BuilderLinkLabelsRetrieveQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/link-labels`, {
      method: 'GET',
      headers,
      query: { ...query, locale: requestLocale(event) },
    })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderLinkLabelsRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
