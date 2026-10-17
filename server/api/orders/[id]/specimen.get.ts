import { createError, defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * The watermarked specimen receipt of a demo store's order. Django builds
 * the PDF on the request and streams it, so the bytes pass through here;
 * a signed-in shopper is identified by their session, a guest by the
 * confirmation link's `uuid`, which Django checks like the invoice's.
 * 403, 404 and 429 reach the page with Django's status.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(event, zDownloadOrderSpecimenReceiptPath)
    const query = await getValidatedQuery(event, zDownloadOrderSpecimenReceiptQuery)
    const url = new URL(`${config.apiBaseUrl}/order/${params.id}/specimen/download`)
    if (query.uuid) {
      url.searchParams.set('uuid', query.uuid)
    }

    // ``arrayBuffer`` rather than ``blob``: Nitro JSON-stringifies a
    // returned ``Blob`` (see the ACS label route).
    const response = await useBackendFetch(event).raw<ArrayBuffer, 'arrayBuffer'>(
      url.toString(),
      {
        method: 'GET',
        headers: createHeaders(event, null, accessToken),
        responseType: 'arrayBuffer',
      },
    )
    if (!response._data) {
      throw createError({ status: 502, statusText: 'Empty PDF body from upstream' })
    }

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', `attachment; filename="specimen-${params.id}.pdf"`)
    return Buffer.from(response._data)
  }
  catch (error) {
    handleError(event, error)
  }
})
