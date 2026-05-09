import * as z from 'zod'

const zAcsCancelPath = z.object({
  // Order IDs are unsigned integers — reject negative values that
  // would 404 against Django and just add noise.
  id: z.union([
    z.string().regex(/^\d+$/),
    z.int().nonnegative(),
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
    handleError(error)
  }
})
