import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

// Only a body that names its refusal is forwarded from a 5xx.
const zCancelRefusal = zOrderCancelError.required({ error: true })

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
    // A refused cancel carries `error.type` that the order page turns
    // into its own message: 400 `parcel_with_courier` (the courier
    // already has the parcel) and 503 `courier_unreachable` (the
    // courier gave no answer; try again later). A thrown error's body
    // is stripped in production, so Django's body is returned as it
    // came: any 4xx, and a 5xx only when it is that typed refusal.
    return forwardUpstreamDocumentedError(event, error, zCancelRefusal)
  }
})
