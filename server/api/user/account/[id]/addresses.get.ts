import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { ZodUserAddress, ZodUserAddressParams, ZodUserAddressQuery } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodUserAddressParams.parse,
    )
    const query = await getValidatedQuery(event, ZodUserAddressQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/user/account/${params.id}/addresses`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodUserAddress))
  }
  catch (error) {
    await handleError(error)
  }
})
