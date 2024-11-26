import * as z from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const response = await $fetch(`${config.apiBaseUrl}/notification/user/mark_all_as_seen`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, z.object({
      success: z.boolean(),
    }))
  }
  catch (error) {
    await handleError(error)
  }
})
