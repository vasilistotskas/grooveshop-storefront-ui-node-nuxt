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
    await handleAllAuthError(error)
  }
})
