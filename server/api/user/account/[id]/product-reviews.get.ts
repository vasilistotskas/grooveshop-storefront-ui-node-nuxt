import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zGetUserAccountProductReviewsPath,
    )
    const query = await getValidatedQuery(event, zGetUserAccountProductReviewsQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/account/${params.id}/product_reviews`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountProductReviewsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
