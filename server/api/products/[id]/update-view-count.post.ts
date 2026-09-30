export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zIncrementProductViewsPath.parse,
    )
    // useBackendFetch relays the visitor's identity: Django throttles
    // view counting per visitor, and a bare $fetch reaches it as this
    // pod, putting every anonymous visitor in one shared bucket.
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/product/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, zIncrementProductViewsResponse)
  }
  catch (error) {
    handleError(error)
  }
})
