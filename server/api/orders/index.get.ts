export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, ZodOrderQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/order`, query)
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodOrder))
  }
  catch (error) {
    await handleError(error)
  }
})
