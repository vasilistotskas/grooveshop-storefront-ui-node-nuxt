import { ZodNotificationUser, ZodNotificationUserBody, ZodNotificationUserParams } from '~/types/notification/user'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, ZodNotificationUserParams.parse)
    const validatedBody = await readValidatedBody(event, ZodNotificationUserBody.parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/notification/user/${params.id}`, {
      body: validatedBody,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodNotificationUser)
  }
  catch (error) {
    await handleError(error)
  }
})
