import { ZodOrder, ZodOrderUUIDParams } from '~/types/order'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodOrderUUIDParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/order/uuid/${params.uuid}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodOrder)
  }
  catch (error) {
    await handleError(error)
  }
})
