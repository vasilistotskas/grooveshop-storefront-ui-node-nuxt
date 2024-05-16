import { ZodCart } from '~/types/cart/cart'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const response = await $fetch(`${config.public.apiBaseUrl}/cart`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodCart)
  }
  catch (error) {
    await handleError(error)
  }
})
