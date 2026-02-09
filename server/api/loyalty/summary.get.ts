export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const response = await $fetch(`${config.apiBaseUrl}/loyalty/summary`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return response
  }
  catch (error) {
    await handleError(error)
  }
})
