import { ZodPagination } from '~/types/pagination'
import { ZodProductFavourite, ZodProductFavouriteQuery } from '~/types/product/favourite'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const query = await getValidatedQuery(event, ZodProductFavouriteQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/favourite`,
      query,
    )
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
