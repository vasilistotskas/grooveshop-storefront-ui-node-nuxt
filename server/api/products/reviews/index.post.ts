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
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
