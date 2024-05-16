import { ZodUserAccount } from '~/types/user/account'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const response = await $fetch(`${config.public.apiBaseUrl}/auth/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    const userResponse = await parseDataAs(response, ZodUserAccount)
    await setUserSession(event, {
      user: userResponse,
    })
    return userResponse
  }
  catch (error) {
    await handleError(error)
  }
})
