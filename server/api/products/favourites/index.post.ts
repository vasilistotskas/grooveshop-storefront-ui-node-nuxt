export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      ZodProductFavouriteCreateBody.parse,
    )
    const query = await getValidatedQuery(event, ZodProductFavouriteQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/favourite`,
      query,
    )
    const response = await $fetch(url, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodProductFavourite)
  }
  catch (error) {
    await handleError(error)
  }
})
