import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'DELETE',
      headers,
    })
    await clearUserSession(event)
    await clearAllAuthSession()
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await clearUserSession(event)
    await clearAllAuthSession()
    await handleAllAuthError(error)
  }
})
