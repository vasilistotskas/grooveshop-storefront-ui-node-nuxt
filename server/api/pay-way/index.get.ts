export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListPayWayData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/pay_way`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListPayWayResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
