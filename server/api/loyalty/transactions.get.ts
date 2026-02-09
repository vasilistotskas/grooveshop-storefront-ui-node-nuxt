export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const query = getQuery(event)

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/transactions`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
      query,
    })

    return response
  }
  catch (error) {
    await handleError(error)
  }
})
