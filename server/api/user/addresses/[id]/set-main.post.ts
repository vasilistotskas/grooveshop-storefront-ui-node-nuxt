import { z } from 'zod'

import { ZodUserAddressParams } from '~/types/user/address'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
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
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
