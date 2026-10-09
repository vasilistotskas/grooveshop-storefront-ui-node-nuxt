import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/**
 * Cancels an active product alert. Only the subscriber (or staff) can
 * delete their own alerts — enforced server-side.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zDestroyProductAlertPath,
    )
    await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/alert/${params.id}`,
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
