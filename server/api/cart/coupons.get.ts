/**
 * Coupons the shopper may use on the current cart, each pre-judged.
 *
 * Uses the cart session headers (NOT createHeaders) so guest carts keep
 * their identity — the verdicts are computed against THIS cart, so
 * hitting Django without the cart identity would judge an empty one.
 *
 * Deliberately NOT cached: every field except the offer copy depends on
 * the cart's contents and the signed-in shopper (the list includes the
 * personal coupons assigned to them), so a shared cache entry here
 * would hand one customer another's verdicts.
 *
 * Django answers 404 when the tenant's promotions plan flag is off and
 * an empty array when the merchant's runtime toggle is; the storefront
 * gates the button on the same runtime flag, so neither reaches the UI.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)

  try {
    const cartHeaders = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart/coupons`, {
      method: 'GET',
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return await parseDataAs(response, zListCartCouponsResponse)
  }
  catch (error) {
    handleError(error)
  }
})
