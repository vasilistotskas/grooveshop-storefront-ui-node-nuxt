import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zSubmitB2bProfileBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/b2b/profile`, {
      method: 'PUT',
      body,
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zSubmitB2bProfileResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
