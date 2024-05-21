import { ZodUserAccount, ZodUserAccountParams, ZodUserAccountPutBody } from '~/types/user/account'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodUserAccountPutBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodUserAccountParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/user/account/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const userResponse = await parseDataAs(response, ZodUserAccount)
    await setUserSession(event, {
      user: userResponse,
    })

    return userResponse
  }
  catch (error) {
    await handleError(error)
  }
})
