/**
 * Attach a coupon code to the cart.
 *
 * Uses the cart session headers (NOT createHeaders) so guest carts keep
 * their identity. Django answers with the updated cart including the
 * promotion fields (promotionDiscount / promotionFreeShipping /
 * appliedCouponCodes); rejections come back as 400 with a
 * machine-readable `reason` from the ACP discount vocabulary and are
 * forwarded verbatim so the widget can explain WHY.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)

  try {
    const body = await readValidatedBody(event, zApplyCartCouponBody.parse)
    const cartHeaders = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart/coupon`, {
      method: 'POST',
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
      body,
    })

    return await parseDataAs(response, zApplyCartCouponResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(error)
  }
})
