export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodCartItemCreateBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/cart/item`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodCartItemCreateResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
