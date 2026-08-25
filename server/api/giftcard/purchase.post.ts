/**
 * Buy a gift card: Django creates the purchase row + a Stripe
 * PaymentIntent and answers with the client secret. The card itself
 * is minted by the payment webhook — never here.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const body = await readValidatedBody(event, zPurchaseGiftCardBody.parse)

    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/giftcard/purchase`,
      {
        method: 'POST',
        headers: {
          ...(accessToken && {
            Authorization: `Bearer ${accessToken}`,
          }),
        },
        body,
      },
    )

    return await parseDataAs(response, zPurchaseGiftCardResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(error)
  }
})
