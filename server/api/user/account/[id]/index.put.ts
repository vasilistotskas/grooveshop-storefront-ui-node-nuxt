import { ZodUserAccount, ZodUserAccountParams, ZodUserAccountPutBody } from '~/types/user/account'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
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
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodUserAccount)
  }
  catch (error) {
    await handleError(error)
  }
})
