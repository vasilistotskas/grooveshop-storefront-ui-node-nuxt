import { ZodPagination } from '~/types/pagination'
import { ZodNotificationUser, ZodNotificationUserParams, ZodNotificationUserQuery } from '~/types/notification/user'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodNotificationUserParams.parse,
    )
    const query = await getValidatedQuery(event, ZodNotificationUserQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/user/account/${params.id}/notifications`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodNotificationUser))
  }
  catch (error) {
    await handleError(error)
  }
})
