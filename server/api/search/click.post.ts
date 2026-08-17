export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(
      event,
      zApiV1SearchClickCreateBody.parse,
    )
    await $fetch(`${config.apiBaseUrl}/search/click`, {
      method: 'POST',
      body,
      headers: createHeaders(null, null),
    })
    setResponseStatus(event, 202)
    return null
  }
  catch (error) {
    handleError(error)
  }
})
