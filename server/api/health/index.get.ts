export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/health`,
      {
        method: 'GET',
      })
    return await parseDataAs(response, zApiV1HealthRetrieveResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
