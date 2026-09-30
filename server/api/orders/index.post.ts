export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Django's OrderViewSet.create has permission_classes=[] (public) so
  // guest checkout is allowed server-side. We don't gate the request
  // here with require* — guests reach Django via their cart_id session
  // cookie. useCartSession.getCartHeaders() already attaches the
  // Authorization Bearer token for logged-in shoppers.
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)

  try {
    wideLog.set({ order: { created: false } })
    const body = await readValidatedBody(event, zCreateOrderBody.parse)
    const cartHeaders = await cartSession.getCartHeaders()

    // Inject Meta Pixel context server-side. We DO NOT trust the
    // client to populate ``client_ip_address`` or ``client_user_agent``
    // — those are read from the request itself. fbp/fbc are cookies
    // the browser pixel manages; we just forward them. The browser
    // already supplied ``event_ids`` and ``consent`` on ``meta``,
    // and we merge here without overwriting them.
    //
    // Production traffic flows Cloudflare → Traefik → Nuxt → Django,
    // so the *real* client IP lives in ``CF-Connecting-IP`` (always
    // set when the zone is proxied). h3's ``getRequestIP`` would
    // otherwise surface the socket address, the Traefik pod. Falls back
    // to ``True-Client-IP`` (CF Enterprise) and finally to XFF/socket so
    // local dev still works. Meta's event matching is its only reader,
    // so a forged value spoils only the forger's own attribution.
    //
    // The pixel writes ``_fbp`` on every visit and ``_fbc`` after an
    // ``?fbclid=`` landing; Meta wants both unhashed, as written. h3's
    // cookie parser decodes what it can and keeps any value it cannot as
    // written — decoding the whole header by hand threw on one malformed
    // third-party cookie and failed the order with a 500.
    const fbp = getCookie(event, '_fbp')
    const fbc = getCookie(event, '_fbc')
    const userAgent = getRequestHeader(event, 'user-agent') ?? undefined
    const clientIp
      = getRequestHeader(event, 'cf-connecting-ip')
        ?? getRequestHeader(event, 'true-client-ip')
        ?? getRequestIP(event, { xForwardedFor: true })
        ?? undefined

    const incomingMeta
      = (body as { meta?: Record<string, unknown> }).meta ?? {}
    const enrichedMeta: Record<string, unknown> = {
      ...incomingMeta,
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(userAgent ? { client_user_agent: userAgent } : {}),
      ...(clientIp ? { client_ip_address: clientIp } : {}),
    }
    const enrichedBody
      = Object.keys(enrichedMeta).length > 0
        ? { ...body, meta: enrichedMeta }
        : body

    const response = await $fetch(`${config.apiBaseUrl}/order`, {
      method: 'POST',
      body: enrichedBody,
      // The shopper's identity (User-Agent, X-Real-IP, proof of edge),
      // not the Nuxt pod's: Django's order attribution reads the
      // User-Agent for in-app browsers. No key overlaps cartHeaders.
      headers: { ...cartHeaders, ...clientIdentityHeaders(event) },
    })

    const parsedData = await parseDataAs(response, zCreateOrderResponse)

    wideLog.set({ order: { created: true } })
    return parsedData
  }
  catch (error) {
    // Django 4xx bodies (DRF field errors) are returned, not thrown —
    // Nitro strips `createError({ data })` in production and the
    // checkout toast needs the field detail. See forwardUpstreamClientError.
    return forwardUpstreamClientError(error)
  }
})
