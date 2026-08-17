import * as z from 'zod'

const zGuestQuery = z.object({
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
    // Guest authorization is possession of the unguessable UUID itself —
    // Django reads it from the path, no query duplication needed.
    const url = new URL(`${config.apiBaseUrl}/order/uuid/${params.uuid}`)

    if (query.languageCode) {
      url.searchParams.set('language_code', query.languageCode)
    }

    const response = await $fetch(url.toString(), {
      method: 'GET',
      headers: createHeaders(null, accessToken),
    })

    return await parseDataAs(response, zRetrieveOrderByUuidResponse)
  }
  catch (error) {
    handleError(error)
  }
})
