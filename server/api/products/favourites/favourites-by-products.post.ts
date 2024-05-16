import type { H3Event } from 'h3'

import { z } from 'zod'
import { ZodProductFavourite, ZodProductFavouritesByProductsBody } from '~/types/product/favourite'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(
      event,
      ZodProductFavouritesByProductsBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/favourite/favourites_by_products`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, z.array(ZodProductFavourite))
  }
  catch (error) {
    await handleError(error)
  }
})
