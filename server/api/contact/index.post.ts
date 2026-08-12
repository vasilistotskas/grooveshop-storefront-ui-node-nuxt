export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zCreateContactBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/contact`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zCreateContactResponse)
  }
  catch (error) {
    // Return Django 4xx bodies (DRF validation detail) so the client
    // can show WHAT was rejected — thrown createError({data}) is
    // stripped in production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(error)
  }
})
