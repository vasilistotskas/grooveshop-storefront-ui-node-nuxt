import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zCancelOrderPath,
    )
    const query = await getValidatedQuery(event, zGuestQuery)
    const body = await readValidatedBody(event, zCancelOrderBody)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/cancel`)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }
    const response = await useBackendFetch(event)(url.toString(), {
      method: 'POST',
      body,
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zCancelOrderResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
