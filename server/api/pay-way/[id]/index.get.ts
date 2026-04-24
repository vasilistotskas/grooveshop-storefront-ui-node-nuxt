export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrievePayWayPath.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/pay_way/${params.id}`, {
      method: 'GET',
    })
    return await parseDataAs(response, zRetrievePayWayResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
