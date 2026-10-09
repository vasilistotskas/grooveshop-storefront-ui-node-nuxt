import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Clones a past order's items back into the authenticated user's active
 * cart. The backend enforces ownership (and only accepts authenticated
 * requests — guest orders cannot be reordered). The response reports which
 * items were re-added and which were skipped because the product went
 * inactive or dropped below the requested quantity.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zReorderOrderPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/order/${params.id}/reorder`,
      {
        method: 'POST',
        headers: createHeaders(event, null, accessToken),
      },
    )
    return await parseDataAs(response, zReorderOrderResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
