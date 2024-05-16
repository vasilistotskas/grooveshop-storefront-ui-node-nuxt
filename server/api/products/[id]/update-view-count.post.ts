import { ZodProduct, ZodProductParams } from '~/types/product/product'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, ZodProduct)
  }
  catch (error) {
    await handleError(error)
  }
})
