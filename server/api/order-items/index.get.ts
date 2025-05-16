export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodPaginationQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/order-items`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodOrderItem))
  }
  catch (error) {
    await handleError(error)
  }
})
