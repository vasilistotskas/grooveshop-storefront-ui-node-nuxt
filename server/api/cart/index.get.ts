import { FetchError } from 'ofetch'

/**
 * What a cart load did, on the request's wide event. A signed-in shopper
 * who ends up with no cart, or with a guest cart, is the anomaly worth
 * keeping: the storefront then shows an empty cart while their real one
 * waits in Django. Booleans only, never a token.
 */
interface CartLoadLog {
  id?: string
  signedIn: boolean
  accessToken: boolean
  cartId: boolean
  outcome: 'no-identity' | 'auth-rejected' | 'loaded'
  owner?: 'user' | 'guest'
  lines?: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)
  const report = (load: CartLoadLog) => {
    wideLog.set({ cart: load })
    const anomalous = load.signedIn && (load.outcome !== 'loaded' || load.owner === 'guest')
    if (anomalous) wideLog.setLevel('warn')
  }

  let identity: Omit<CartLoadLog, 'outcome'> = { signedIn: false, accessToken: false, cartId: false }

  try {
    const sessionData = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)
    identity = {
      id: sessionData.cartId,
      signedIn: Boolean((await getUserSession(event)).user),
      accessToken: Boolean(accessToken),
      cartId: Boolean(sessionData.cartId),
    }

    // Need either a guest cartId or an authenticated user to fetch the cart
    if (!sessionData.cartId && !accessToken) {
      report({ ...identity, outcome: 'no-identity' })
      return null
    }

    const headers = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart`, {
      method: 'GET',
      headers,
    })

    const parsedData = await parseDataAs(response, zRetrieveCartResponse)

    await cartSession.handleCartResponse(parsedData)

    report({
      ...identity,
      id: parsedData.uuid,
      outcome: 'loaded',
      owner: parsedData.user ? 'user' : 'guest',
      lines: parsedData.items.length,
    })

    return parsedData
  }
  catch (error) {
    // If the auth token is expired/invalid (401/403), the user's session
    // was likely cleared by the allauth routes during the same SSR pass.
    // Return null (no cart) instead of throwing — the browser will get the
    // session-clearing cookie and subsequent requests will work cleanly.
    if (error instanceof FetchError && (error.statusCode === 401 || error.statusCode === 403)) {
      log.info('cart', `Auth expired (${error.statusCode}), returning empty cart`)
      report({ ...identity, outcome: 'auth-rejected' })
      return null
    }
    handleError(error)
  }
})
