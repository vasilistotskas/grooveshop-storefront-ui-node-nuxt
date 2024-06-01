import { ZodChangeUserNameBody, ZodChangeUserNameResponse, ZodUserAccountParams } from '~/types/user/account'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodChangeUserNameBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodUserAccountParams.parse,
    )
    const response = await $fetch(`${config.public.apiBaseUrl}/user/account/${params.id}/change_username`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await parseDataAs(response, ZodChangeUserNameResponse)
    await setUserSession(event, {
      user: {
        ...session?.user,
        username: body.username,
      },
    })

    return data
  }
  catch (error) {
    await handleError(error)
  }
})
