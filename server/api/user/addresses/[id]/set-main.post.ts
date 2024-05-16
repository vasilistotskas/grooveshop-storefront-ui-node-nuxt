import { z } from 'zod'

import { ZodUserAddressParams } from '~/types/user/address'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
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
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
