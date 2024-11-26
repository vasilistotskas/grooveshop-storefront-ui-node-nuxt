export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodCartItemPutBody.parse)
    const params = await getValidatedRouterParams(event, ZodCartItemParams.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, ZodCartItem)
  }
  catch (error) {
    await handleError(error)
  }
})
