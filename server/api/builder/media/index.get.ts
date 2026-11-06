import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * The media library, newest first unless `ordering` says otherwise, for the
 * editor's image picker: Django's `GET builder/media` (`{ count, results }`,
 * each asset with its alt text in every language of the store and the keys
 * of the documents of the current release that use it). `search` matches the
 * file name and the alt text; `page` and `pageSize` are Django's.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const query = await getValidatedQuery(event, zApiV1BuilderMediaListQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/media`, { method: 'GET', headers, query })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderMediaListResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
