export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zSubmitB2bProfileBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/b2b/profile`, {
      method: 'PUT',
      body,
      headers: createHeaders(null, accessToken),
    })
    return await parseDataAs(response, zSubmitB2bProfileResponse)
  }
  catch (error) {
    handleError(error)
  }
})
