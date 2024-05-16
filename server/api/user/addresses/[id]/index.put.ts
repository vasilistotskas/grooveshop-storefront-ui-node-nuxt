import type { H3Event } from 'h3'

import { ZodUserAddress, ZodUserAddressParams, ZodUserAddressPutBody } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
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
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodUserAddress)
  }
  catch (error) {
    await handleError(error)
  }
})
