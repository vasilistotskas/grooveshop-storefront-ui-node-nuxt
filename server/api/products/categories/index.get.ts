import { ZodPagination } from '~/types/pagination'
import { ZodProductCategory } from '~/types/product/category'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/category`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodPagination(ZodProductCategory))
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'ProductCategoryViewSet' })
