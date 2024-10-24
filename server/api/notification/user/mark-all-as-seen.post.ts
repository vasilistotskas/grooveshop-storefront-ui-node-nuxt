import { object, boolean } from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const response = await $fetch(`${config.public.apiBaseUrl}/notification/user/mark_all_as_seen`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, object({
      success: boolean(),
    }))
  }
  catch (error) {
    await handleError(error)
  }
})
