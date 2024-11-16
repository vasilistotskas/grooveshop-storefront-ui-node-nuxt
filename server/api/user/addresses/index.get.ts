export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, ZodUserAddressQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/user/address`, query)
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodUserAddress))
  }
  catch (error) {
    await handleError(error)
  }
})
