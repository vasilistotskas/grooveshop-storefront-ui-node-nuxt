import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zCreateProductReviewBody)
    const query = await getValidatedQuery(
      event,
      zCreateProductReviewQuery,
    )
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/review`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateProductReviewResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
