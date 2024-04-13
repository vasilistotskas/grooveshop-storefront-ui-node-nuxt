import type { H3Event } from 'h3'
import {
  ZodProductFavourite,
  ZodProductFavouriteParams,
  ZodProductFavouriteQuery,
} from '~/types/product/favourite'
import { ZodPagination } from '~/types/pagination'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const params = await getValidatedRouterParams(
    event,
    ZodProductFavouriteParams.parse,
  )
  const query = await getValidatedQuery(event, ZodProductFavouriteQuery.parse)
  const url = buildFullUrl(
    `${config.public.apiBaseUrl}/user/account/${params.id}/favourite_products`,
    query,
  )
  try {
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodProductFavourite))
  }
  catch (error) {
    await handleError(error)
  }
})
