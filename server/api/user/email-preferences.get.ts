import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * The signed-in customer's choices among the store's marketing emails
 * ("Store emails"): each type the store sends, with whether the account's
 * address still receives it. Django reads the address from the account,
 * never from the request, and answers the titles in the request's language.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/email-preferences`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetEmailPreferencesResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
