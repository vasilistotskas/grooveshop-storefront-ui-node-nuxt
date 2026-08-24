export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zCreateFeedbackBody.parse)
    // useBackendFetch so Django resolves the tenant from X-Forwarded-Host
    // — feedback rows must land in that tenant's schema and its
    // notification email must go to that tenant's support inbox (same
    // rationale as contact/index.post.ts).
    const response = await useBackendFetch()(`${config.apiBaseUrl}/feedback`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zCreateFeedbackResponse)
  }
  catch (error) {
    // Return Django 4xx bodies (DRF validation detail) so the client can
    // show WHAT was rejected — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(error)
  }
})
