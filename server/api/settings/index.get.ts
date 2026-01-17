export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/settings`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zSettingsListResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'SettingsViewSet',
  maxAge: 60 * 60, // 1 hour - settings rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
})
