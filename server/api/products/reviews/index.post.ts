export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodProductReviewCreateBody.parse)
    const query = await getValidatedQuery(
      event,
      ZodProductReviewCreateQuery.parse,
    )
    const url = buildFullUrl(`${config.apiBaseUrl}/product/review`, query)
    const response = await $fetch(url, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodProductReview)
  }
  catch (error) {
    await handleError(error)
  }
})
