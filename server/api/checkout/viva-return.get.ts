import { z } from 'zod'

// Viva Wallet appends
// ``?t=<transaction_id>&s=<status>&eventId=<merchantTrns>&lang=...``
// to the merchant-portal-configured success URL after a hosted-
// checkout payment. The portal URL is a single static string with no
// per-order substitution, so the storefront uses this proxy to
// translate Viva's params into the order's UUID and forward the
// customer to ``/checkout/success/{uuid}``.
//
// Both ``t`` and ``eventId`` are forwarded to Django. ``payment_id``
// is only set on the order once the webhook arrives, which can lag
// the redirect by tens of seconds; the backend falls back to
// ``eventId`` (we set ``merchantTrns = order.uuid`` at session
// creation, so it's always populated by the time Viva redirects) so
// the customer isn't stuck on an error page during the webhook race.
//
// No auth required — both ``t`` (Viva-generated UUID) and
// ``eventId`` (our order UUID) are unguessable, and the backend
// response is intentionally minimal (id, uuid, status, payment_status
// — no PII).
const querySchema = z.object({
  t: z.string().optional().default(''),
  eventId: z.string().optional().default(''),
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
    if (!query.t && !query.eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing transaction id (t) or eventId.',
      })
    }
    const response = await $fetch(`${config.apiBaseUrl}/order/viva_return`, {
      method: 'GET',
      query: { t: query.t, eventId: query.eventId },
      headers: createHeaders(),
    })
    return await parseDataAs(response, responseSchema)
  }
  catch (error) {
    handleError(error)
  }
})
