import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const query = await getValidatedQuery(event, zListProductFavouriteQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/favourite`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListProductFavouriteResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
