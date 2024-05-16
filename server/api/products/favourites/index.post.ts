import type { H3Event } from 'h3'

import { ZodProductFavourite, ZodProductFavouriteCreateBody, ZodProductFavouriteQuery } from '~/types/product/favourite'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(
      event,
      ZodProductFavouriteCreateBody.parse,
    )
    const query = await getValidatedQuery(event, ZodProductFavouriteQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/favourite`,
      query,
    )
    const response = await $fetch(url, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodProductFavourite)
  }
  catch (error) {
    await handleError(error)
  }
})
