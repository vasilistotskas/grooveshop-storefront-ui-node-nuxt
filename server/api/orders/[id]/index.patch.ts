export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
    const body = await readValidatedBody(event, ZodPatchedOrderCreateUpdate.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}`, {
      method: 'PATCH',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodOrderCreateUpdate)
  }
  catch (error) {
    await handleError(error)
  }
})
