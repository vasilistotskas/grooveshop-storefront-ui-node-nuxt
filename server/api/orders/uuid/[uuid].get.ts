import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

const zGuestQuery = z.object({
  languageCode: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveOrderByUuidPath,
    )
    const query = await getValidatedQuery(event, zGuestQuery)
    // Guest authorization is possession of the unguessable UUID itself —
    // Django reads it from the path, no query duplication needed.
    const url = new URL(`${config.apiBaseUrl}/order/uuid/${params.uuid}`)

    if (query.languageCode) {
      url.searchParams.set('language_code', query.languageCode)
    }

    const response = await useBackendFetch(event)(url.toString(), {
      method: 'GET',
      headers: createHeaders(event, null, accessToken),
    })

    return await parseDataAs(response, zRetrieveOrderByUuidResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
