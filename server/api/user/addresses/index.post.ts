export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodUserAddressCreateBody.parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/user/address`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodUserAddress)
  }
  catch (error) {
    await handleError(error)
  }
})
