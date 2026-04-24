import * as z from 'zod'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveOrderInvoicePath.parse,
    )
    const query = await getValidatedQuery(event, zGuestQuery.parse)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/invoice`)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }
    const response = await $fetch(url.toString(), {
      method: 'GET',
      ...(accessToken && {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    })
    return await parseDataAs(response, zRetrieveOrderInvoiceResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
