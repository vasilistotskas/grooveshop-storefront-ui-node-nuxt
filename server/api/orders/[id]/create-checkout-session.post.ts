import * as z from 'zod'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const headers = await getAllAuthHeaders()
  try {
    const params = await getValidatedRouterParams(
      event,
      zCreateOrderCheckoutSessionPath.parse,
    )
    const query = await getValidatedQuery(event, zGuestQuery.parse)
    const body = await readValidatedBody(event, zCreateOrderCheckoutSessionBody.parse)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/create_checkout_session`)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }
    const response = await $fetch(url.toString(), {
      method: 'POST',
      body,
      headers,
    })
    return await parseDataAs(response, zCreateOrderCheckoutSessionResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
