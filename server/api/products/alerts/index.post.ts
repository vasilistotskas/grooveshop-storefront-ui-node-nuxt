import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Creates a product alert subscription (restock or price-drop) for the
 * signed-in user OR a guest email. A signed-in user gets 201 and the alert,
 * active at once; the backend enforces the "one active alert per kind per
 * product" uniqueness and returns 409 if they already subscribed. A guest
 * always gets 202 and a `detail`, whatever the address: the alert starts
 * only when they confirm the emailed link (`alerts/confirm/[token].post.ts`).
 * `zCreateProductAlertResponse` is the union of the two bodies.
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
    return handleError(event, error)
  }
})
