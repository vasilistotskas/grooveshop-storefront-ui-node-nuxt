import * as z from 'zod'

const zPaymentStatusParams = z.object({
  id: z.union([z.string().regex(/^-?\d+$/), z.coerce.number().int()]),
})

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zPaymentStatusParams.parse,
    )
    const query = await getValidatedQuery(event, zGuestQuery.parse)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/payment_status`)
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
    // Use the auto-generated schema — amount is a number (not string)
    return await parseDataAs(response, zPaymentStatusResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
