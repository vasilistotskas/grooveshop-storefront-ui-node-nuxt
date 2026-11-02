import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Every builder document of the store, for the editor's page switcher and
 * its group panes: `{ key, kind, draftRevision, updatedAt, updatedBy,
 * publishedVersion, hasUnpublishedChanges }`, sorted by key as Django sorts
 * them. Never a document's content (`GET documents/<key>` reads that).
 *
 * Django pages the list; a store holds at most `BUILDER_MAX_PAGES` pages
 * plus its templates, groups and theme, so this walks the pages at the
 * largest size Django serves and answers the whole list in one array.
 *
 * Staff only (`requireBuilderStaff`, the token as StaffBearer), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const documents: DocumentList[] = []
    for (let page = 1; ; page++) {
      const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/documents`, {
        method: 'GET',
        headers,
        query: { page, pageSize: BUILDER_DOCUMENTS_PAGE_SIZE },
      })
      const { results, totalPages } = await parseDataAs(response, zApiV1BuilderDocumentsListResponse)
      documents.push(...results)
      if (page >= (totalPages ?? 1)) break
    }
    event.res.headers.set('Cache-Control', 'private, no-store')
    return documents
  }
  catch (error) {
    return handleError(event, error)
  }
})
