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
    wideLog.set({ order: { created: true } })
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
    // set when the zone is proxied). h3's ``getRequestIP`` reads
    // X-Forwarded-For, which would otherwise surface K3s klipper-lb's
    // SNAT address (10.42.0.1) under default settings. Falls back to
    // ``True-Client-IP`` (CF Enterprise) and finally to XFF/socket so
    // local dev still works.
    const cookieHeader = getRequestHeader(event, 'cookie')
    const { fbp, fbc } = parseFbpFbcFromCookieHeader(cookieHeader)
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
      headers: cartHeaders,
    })

    const parsedData = await parseDataAs(response, zCreateOrderResponse)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
