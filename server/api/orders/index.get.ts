export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodOrderQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/order`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodOrder))
  }
  catch (error) {
    await handleError(error)
  }
})
