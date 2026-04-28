import * as z from 'zod'

const zBoxNowLabelPath = z.object({
  id: z.union([
    z.string().regex(/^-?\d+$/),
    z.int(),
  ]),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const headers = await getAllAuthHeaders()
  try {
    const params = await getValidatedRouterParams(event, zBoxNowLabelPath.parse)

    const response = await $fetch.raw<Blob>(`${config.apiBaseUrl}/order/${params.id}/boxnow_label`, {
      method: 'GET',
      headers,
      responseType: 'blob',
    })

    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="boxnow-${params.id}.pdf"`)

    return response._data
  }
  catch (error) {
    await handleError(error)
  }
})
