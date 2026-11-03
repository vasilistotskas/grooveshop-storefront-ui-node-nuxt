import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * One stored version with its content, `data` and `i18n` as the editor's
 * working copy has them (`draft` and `i18n` of a document), for the history's
 * preview. The content is opaque here: the editor parses it against the
 * blocks of this build, as it does a draft.
 *
 * A number Django does not hold is its 404, returned as it is. Staff only,
 * never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { key, number } = await parseRouterParams(event, ZodBuilderVersionParams)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/documents/${encodeURIComponent(key)}/versions/${number}`,
      { method: 'GET', headers },
    )
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderDocumentsVersionsRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
