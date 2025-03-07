export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodPayWayQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/pay_way`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodPayWay))
  }
  catch (error) {
    await handleError(error)
  }
})
