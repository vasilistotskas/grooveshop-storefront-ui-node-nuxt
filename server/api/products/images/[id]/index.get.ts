import { ZodProductImage, ZodProductImageParams, ZodProductImageQuery } from '~/types/product/image'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductImageParams.parse)
    const query = await getValidatedQuery(event, ZodProductImageQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/image/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodProductImage)
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'ProductImageViewSet' })
