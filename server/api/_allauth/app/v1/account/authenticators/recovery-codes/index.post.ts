import { any } from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/recovery-codes`, {
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, any())
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
