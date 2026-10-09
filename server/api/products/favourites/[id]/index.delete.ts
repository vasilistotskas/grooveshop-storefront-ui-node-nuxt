import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zDestroyProductFavouritePath,
    )
    await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/favourite/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    setResponseStatus(event, 204)
  }
  catch (error) {
    handleError(event, error)
  }
})
