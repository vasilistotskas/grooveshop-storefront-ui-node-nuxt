import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(
      event,
      zCreateProductFavouriteBody,
    )
    const query = await getValidatedQuery(event, zCreateProductFavouriteQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/favourite`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateProductFavouriteResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
