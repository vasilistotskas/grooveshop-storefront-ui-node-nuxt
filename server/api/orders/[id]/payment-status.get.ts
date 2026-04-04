import * as z from 'zod'

const zPaymentStatusResponse = z.object({
  paymentId: z.string(),
  status: z.string(),
  rawStatus: z.string().optional(),
  provider: z.string(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  created: z.number().int().optional(),
  lastUpdated: z.string().nullable().optional(),
  error: z.string().optional(),
})

const zPaymentStatusParams = z.object({
  id: z.union([z.string().regex(/^-?\d+$/), z.coerce.number().int()]),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zPaymentStatusParams.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}/payment_status`, {
      method: 'GET',
      ...(accessToken && {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    })
    return await parseDataAs(response, zPaymentStatusResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
