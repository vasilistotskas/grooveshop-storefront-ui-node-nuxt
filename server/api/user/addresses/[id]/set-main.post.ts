import { any } from 'zod'

import { ZodUserAddressParams } from '~/types/user/address'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodUserAddressParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/user/address/${params.id}/set_main`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, any())
  }
  catch (error) {
    await handleError(error)
  }
})
