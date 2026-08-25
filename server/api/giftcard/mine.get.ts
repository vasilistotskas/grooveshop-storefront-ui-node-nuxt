/**
 * Gift cards linked to the authenticated account.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const response = await useBackendFetch()(
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
    return forwardUpstreamClientError(error)
  }
})
