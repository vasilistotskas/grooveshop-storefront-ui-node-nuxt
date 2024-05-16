import { ZodUserAccount, ZodUserAccountParams } from '~/types/user/account'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const form = await readFormData(event)
    const params = await getValidatedRouterParams(
      event,
      ZodUserAccountParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/user/account/${params.id}`,
      {
        method: 'PATCH',
        body: form,
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
