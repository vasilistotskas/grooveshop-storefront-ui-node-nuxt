import { object, array, number } from 'zod'
import { ZodNotification } from '~/types/notification'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, object({
      ids: array(number()),
    }).parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/notification/ids`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, array(ZodNotification))
  }
  catch (error) {
    await handleError(error)
  }
})
