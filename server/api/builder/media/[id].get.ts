import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * One asset of the library, as the list holds it: the editor names the image
 * a setting holds by it. Django's 404 for an asset that is gone comes back as
 * it is.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { id } = await parseRouterParams(event, zApiV1BuilderMediaRetrievePath)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/media/${id}`, { method: 'GET', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderMediaRetrieveResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
