import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * A page of one document's history, newest version first: `{ number, kind,
 * note, createdAt, createdBy, sizeBytes, blockTypes, catalogueHash }` of
 * each saved (`checkpoint`) and published (`publish`) version, without the
 * content (`versions/<number>` reads that). The draft and the live version
 * are the document's own (`DocumentDetail`), not entries of this list.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { key } = await parseRouterParams(event, ZodBuilderDocumentParams)
    const { page } = await getValidatedQuery(event, ZodBuilderVersionsQuery)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/documents/${encodeURIComponent(key)}/versions`,
      { method: 'GET', headers, query: { page: page ?? 1, pageSize: BUILDER_VERSIONS_PAGE_SIZE } },
    )
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderDocumentsVersionsListResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
