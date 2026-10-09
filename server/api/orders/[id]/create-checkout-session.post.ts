import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const headers = await getAllAuthHeaders(event)
  try {
    const params = await parseRouterParams(
      event,
      zCreateOrderCheckoutSessionPath,
    )
    const query = await getValidatedQuery(event, zGuestQuery)
    const body = await readValidatedBody(event, zCreateOrderCheckoutSessionBody)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/create_checkout_session`)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }
    const response = await useBackendFetch(event)(url.toString(), {
      method: 'POST',
      body,
      headers,
    })
    return await parseDataAs(response, zCreateOrderCheckoutSessionResponse)
  }
  catch (error) {
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
