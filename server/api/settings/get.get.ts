export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zApiV1SettingsGetRetrieveData.shape.query.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/settings/get`,
      {
        method: 'GET',
        query,
      },
    )
    return await parseDataAs(response, zApiV1SettingsGetRetrieveResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
