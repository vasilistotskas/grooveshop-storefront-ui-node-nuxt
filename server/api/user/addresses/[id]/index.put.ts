import { ZodUserAddress, ZodUserAddressParams, ZodUserAddressPutBody } from '~/types/user/address'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodUserAddressPutBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodUserAddressParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, ZodUserAddress)
  }
  catch (error) {
    await handleError(error)
  }
})
