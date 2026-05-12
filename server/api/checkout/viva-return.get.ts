import { z } from 'zod'

// Viva Wallet appends ``?t=<transaction_id>&s=<status>...`` to the
// merchant-portal-configured success URL after a hosted-checkout
// payment. The portal URL is a single static string with no
// per-order substitution, so the storefront uses this proxy to
// translate the Viva transaction_id into the order's UUID and
// forward the customer to ``/checkout/success/{uuid}``.
//
// No auth required — the transaction_id is a Viva-generated UUID
// (unguessable) and the backend response is intentionally minimal
// (id, uuid, status, payment_status — no PII).
const querySchema = z.object({
  t: z.string().min(1, 'Missing transaction id (t).'),
})

const responseSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  status: z.string(),
  paymentStatus: z.string(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, querySchema.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/viva_return`, {
      method: 'GET',
      query: { t: query.t },
      headers: createHeaders(),
    })
    return await parseDataAs(response, responseSchema)
  }
  catch (error) {
    handleError(error)
  }
})
