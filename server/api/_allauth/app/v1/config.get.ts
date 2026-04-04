export default defineEventHandler(async (event) => {
  // During Nitro prerendering the external API may be unreachable
  // (e.g. Cloudflare managed challenge blocks CI runners).
  // Return a minimal response — the client will fetch the real config on hydration.
  if (getRequestHeader(event, 'x-nitro-prerender')) {
    return { status: 200 as const, data: {} }
  }

  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/config`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodConfigResponse)
  }
  catch (error) {
    // Config is public data. If the session token is expired (410), clear
    // the stale session and retry without auth — the config must always load.
    if (isAllAuthError(error) && error.data?.status === 410) {
      log.info('auth', 'Config: expired session (410), clearing and retrying without auth')
      await clearUserSession(event)
      const headers = createHeaders()
      const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/config`, {
        method: 'GET',
        headers,
      })
      return await parseDataAs(response, ZodConfigResponse)
    }
    await handleAllAuthError(error)
  }
})
