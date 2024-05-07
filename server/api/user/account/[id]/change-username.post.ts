import type { H3Event } from 'h3'
import { ZodUserAccountParams, ZodChangeUserNameBody, ZodChangeUserNameResponse } from '~/types/user/account'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const body = await readValidatedBody(event, ZodChangeUserNameBody.parse)
  const params = await getValidatedRouterParams(
    event,
    ZodUserAccountParams.parse,
  )
  const response = await $fetch(`${config.public.apiBaseUrl}/user/account/${params.id}/change_username`, {
    method: 'POST',
    body,
    headers: {
      Authorization: `Bearer ${session?.token}`,
    },
  })

  await setUserSession(event, {
    user: {
      ...session?.user,
      username: body.username,
    },
  })

  return await parseDataAs(response, ZodChangeUserNameResponse)
})
