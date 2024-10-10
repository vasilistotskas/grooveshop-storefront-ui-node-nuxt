import { object, array, number, boolean } from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, object({
      notificationUserIds: array(number()),
    }).parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/notification/user/mark_as_seen`, {
      method: 'POST',
      body,
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
