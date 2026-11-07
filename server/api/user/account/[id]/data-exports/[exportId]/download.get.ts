import { createError, defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * A shopper's data export, downloaded through their session: Django serves it
 * to the account's owner alone, and the browser holds no token to send, so the
 * bytes pass through here. 401, 404 and 410 reach the page with Django's status.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(event, zDownloadUserAccountDataExportPath)

    // ``arrayBuffer`` rather than ``blob``: Nitro JSON-stringifies a
    // returned ``Blob`` (see the ACS label route).
    const response = await useBackendFetch(event).raw<ArrayBuffer, 'arrayBuffer'>(
      `${config.apiBaseUrl}/user/account/${params.id}/data_exports/${params.exportId}/download`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'arrayBuffer',
      },
    )
    if (!response._data?.byteLength) {
      throw createError({ status: 502, statusText: 'Empty data export from upstream' })
    }

    event.res.headers.set('Content-Type', 'application/json')
    event.res.headers.set('Content-Disposition', `attachment; filename="data-export-${params.id}.json"`)
    return Buffer.from(response._data)
  }
  catch (error) {
    return handleError(event, error)
  }
})
