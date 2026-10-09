import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Check a gift card's balance and redeemability.
 *
 * The code IS the bearer secret — Django throttles this endpoint
 * tightly, so surface its 400/429 bodies verbatim.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const body = await readValidatedBody(event, zCheckGiftCardBody)

    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/giftcard/check`,
      {
        method: 'POST',
        body,
      },
    )

    return await parseDataAs(response, zCheckGiftCardResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(event, error)
  }
})
