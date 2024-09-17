import { ZodProductCategory, ZodProductCategoryParams } from '~/types/product/category'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProductCategoryParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodProductCategory)
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'ProductCategoryViewSet' })
