import * as z from 'zod'
import { createError, defineEventHandler, useRuntimeConfig } from 'nuxt/server'

const zAcsLabelPath = z.object({
  // Order IDs are unsigned integers — reject negative values that
  // would 404 against Django anyway and just produce noise in logs.
  id: z.union([
    z.string().regex(/^\d+$/),
    z.int().nonnegative(),
  ]),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const headers = await getAllAuthHeaders(event)
  try {
    const params = await parseRouterParams(event, zAcsLabelPath)

    // Use ``arrayBuffer`` rather than ``blob``: Nitro's default
    // response handler JSON-stringifies a returned ``Blob`` (it has
    // no built-in serialiser for the platform Blob type), so the
    // customer ends up with ``[object Blob]`` instead of a PDF.
    // Convert to ``Buffer`` and let Nitro send raw binary with the
    // Content-Type we set explicitly.
    const response = await useBackendFetch(event).raw<ArrayBuffer, 'arrayBuffer'>(
      `${config.apiBaseUrl}/order/${params.id}/acs_label`,
      {
        method: 'GET',
        headers,
        responseType: 'arrayBuffer',
      },
    )

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', `attachment; filename="acs-${params.id}.pdf"`)

    if (!response._data) {
      throw createError({ status: 502, statusText: 'Empty PDF body from upstream' })
    }
    return Buffer.from(response._data)
  }
  catch (error) {
    handleError(event, error)
  }
})
