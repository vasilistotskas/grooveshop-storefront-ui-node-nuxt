export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const pageType = getRouterParam(event, 'pageType')

  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/page-config/${pageType}`,
      { method: 'GET' },
    )
    return await parseDataAs(response, zPageLayout)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'pageConfig',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: (event) => {
    const pageType = getRouterParam(event, 'pageType')
    return tenantCacheKey(event, `page-config:${pageType}`)
  },
})
