import { ZodCart } from '~/types/cart/cart'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
  try {
    const response = await $fetch(`${config.public.apiBaseUrl}/cart`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodCart)
  }
  catch (error) {
    await handleError(error)
  }
})
