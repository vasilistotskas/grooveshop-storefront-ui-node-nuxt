import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodProductFavouriteParams } from '~/types/product/favourite'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const params = await getValidatedRouterParams(
    event,
    ZodProductFavouriteParams.parse,
  )
  const response = await $fetch(
    `${config.public.apiBaseUrl}/product/favourite/${params.id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    },
  )
  return await parseDataAs(response, z.any())
})
