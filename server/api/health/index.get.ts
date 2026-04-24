export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/health`,
      {
        method: 'GET',
      })
    return await parseDataAs(response, zHealthCheckResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  maxAge: 15,
  swr: true,
  staleMaxAge: 30,
})
