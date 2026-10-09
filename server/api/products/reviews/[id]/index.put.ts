import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zPartialUpdateProductReviewBody)
    const params = await parseRouterParams(
      event,
      zPartialUpdateProductReviewPath,
    )
    const query = await getValidatedQuery(event, zPartialUpdateProductReviewQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/review/${params.id}`, {
      method: 'PUT',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zPartialUpdateProductReviewResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
