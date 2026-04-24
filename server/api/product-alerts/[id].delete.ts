/**
 * Delete (unsubscribe) a product alert. Authenticated users only.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const id = getRouterParam(event, 'id')
    if (!id || !/^\d+$/.test(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid alert id' })
    }
    const session = await requireUserSession(event)
    const accessToken = session?.secure?.accessToken

    await $fetch(`${config.apiBaseUrl}/product/alert/${id}`, {
      method: 'DELETE',
      headers: {
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        'X-Forwarded-Host': getRequestHost(event, { xForwardedHost: false }) || config.public.djangoHostName,
        'X-Forwarded-Proto': 'https',
      },
    })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    await handleError(error)
  }
})
