export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const body = await readBody(event)

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/redeem`, {
      method: 'POST',
      body,
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
