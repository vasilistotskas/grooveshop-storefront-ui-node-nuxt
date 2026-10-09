import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveOrderInvoicePath,
    )
    const query = await getValidatedQuery(event, zGuestQuery)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/invoice`)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }
    const response = await useBackendFetch(event)(url.toString(), {
      method: 'GET',
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zRetrieveOrderInvoiceResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
