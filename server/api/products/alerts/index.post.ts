import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Creates a product alert subscription (restock or price-drop) for the
 * signed-in user OR a guest email. The backend enforces the "one active
 * alert per kind per product" uniqueness and returns 409 if the caller
 * already subscribed.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zCreateProductAlertBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/alert`, {
      method: 'POST',
      body,
      ...(accessToken && {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    })
    return await parseDataAs(response, zCreateProductAlertResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
