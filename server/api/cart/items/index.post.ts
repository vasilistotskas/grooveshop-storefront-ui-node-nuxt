import { ZodCartItemCreateBody, ZodCartItemCreateResponse } from '~/types/cart/cart-item'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodCartItemCreateBody.parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/cart/item`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodCartItemCreateResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
