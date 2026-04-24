export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zCreateContactBody.parse)
    // Use the named backend fetch so Django resolves the tenant from
    // X-Forwarded-Host — contact emails need to go to the right tenant's
    // support inbox, and the contact row must be stored in that tenant's
    // schema. The global $fetch interceptor in forwarded-proto.ts covers
    // bare $fetch too, but calling useBackendFetch() explicitly
    // documents the intent and pins the behaviour even if the global
    // patch is later removed.
    const response = await useBackendFetch()(`${config.apiBaseUrl}/contact`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zCreateContactResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
