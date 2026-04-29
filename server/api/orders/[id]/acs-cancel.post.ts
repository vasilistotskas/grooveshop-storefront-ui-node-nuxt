import * as z from 'zod'

const zAcsCancelPath = z.object({
  id: z.union([
    z.string().regex(/^-?\d+$/),
    z.int(),
  ]),
})

const zAcsCancelBody = z.object({
  reason: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const headers = await getAllAuthHeaders()
  try {
    const params = await getValidatedRouterParams(event, zAcsCancelPath.parse)
    const body = await readValidatedBody(event, zAcsCancelBody.parse)

    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}/acs_cancel`, {
      method: 'POST',
      body,
      headers,
    })

    return await parseDataAs(response, zOrderDetail)
  }
  catch (error) {
    await handleError(error)
  }
})
