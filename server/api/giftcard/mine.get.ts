import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Gift cards linked to the authenticated account.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/giftcard/mine`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    return await parseDataAs(response, zListMyGiftCardsResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(event, error)
  }
})
