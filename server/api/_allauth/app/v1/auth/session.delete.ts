import { any } from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'DELETE',
      headers,
    })
    await clearUserSession(event)
    return await parseDataAs(response, any())
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
