import * as z from 'zod'

const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
  languageCode: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveOrderByUuidPath.parse,
    )
    const query = await getValidatedQuery(event, zGuestQuery.parse)
    const url = new URL(`${config.apiBaseUrl}/order/uuid/${params.uuid}`)

    // Forward uuid query param so Django's IsOwnerOrAdminOrGuest permission
    // check passes for guest orders (checks request.query_params["uuid"] == obj.uuid)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }
    if (query.languageCode) {
      url.searchParams.set('language_code', query.languageCode)
    }

    const response = await $fetch(url.toString(), {
      method: 'GET',
      ...(accessToken && {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    })

    return await parseDataAs(response, zRetrieveOrderByUuidResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
