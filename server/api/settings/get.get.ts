export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zSettingsGetRetrieveData.shape.query.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/settings/get`,
      {
        method: 'GET',
        query,
      },
    )
    return await parseDataAs(response, zSettingsGetRetrieveResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
