import { z } from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/notification/user/unseen_count`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, z.object({
      count: z.number(),
    }).optional())
  }
  catch (error) {
    await handleError(error)
  }
})
