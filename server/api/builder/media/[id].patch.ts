import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Changes an asset's focal point and the alt text of the languages the body
 * names (`{ focalX?, focalY?, alt?: { <language>: text } }`); the file never
 * changes, and a language not named keeps its text. A used asset's change
 * reaches the storefront at once. Answers the asset as the list holds it.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { id } = await parseRouterParams(event, zApiV1BuilderMediaPartialUpdatePath)
    const body = await readValidatedBody(event, zApiV1BuilderMediaPartialUpdateBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/media/${id}`, { method: 'PATCH', headers, body })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderMediaPartialUpdateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
