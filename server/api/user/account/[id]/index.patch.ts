import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const form = await event.req.formData()
    const params = await parseRouterParams(
      event,
      zPartialUpdateUserAccountPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/account/${params.id}`,
      {
        method: 'PATCH',
        body: form,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const userResponse = await parseDataAs(response, zPartialUpdateUserAccountResponse)
    await setUserSession(event, {
      user: userResponse,
    })

    return userResponse
  }
  catch (error) {
    // Return Django 4xx bodies (DRF detail / field errors, e.g. image
    // or username validation) so clients can show the reason — thrown
    // createError({data}) is stripped in production. See
    // forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
