export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/settings`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zApiV1SettingsListResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
