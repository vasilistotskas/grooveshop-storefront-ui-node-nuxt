export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodProductQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/product`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodProduct))
  }
  catch (error) {
    await handleError(error)
  }
})
