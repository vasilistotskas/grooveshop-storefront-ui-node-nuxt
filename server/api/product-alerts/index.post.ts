import { z } from 'zod'

/**
 * Create a product alert subscription (restock or price drop).
 *
 * Forwards to Django `/product/alert`. Authenticated users are resolved
 * server-side via the session token; anonymous users must supply an
 * email address so the single-shot notification can be delivered.
 */

const zBody = z.object({
  kind: z.enum(['restock', 'price_drop']),
  product: z.number().int().positive(),
  email: z.string().email().optional(),
  targetPrice: z.number().nonnegative().optional(),
}).refine(
  body => body.kind !== 'price_drop' || typeof body.targetPrice === 'number',
  { message: 'targetPrice is required for price_drop alerts', path: ['targetPrice'] },
)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zBody.parse)
    const session = await getUserSession(event)
    const accessToken = session?.secure?.accessToken

    const payload: Record<string, unknown> = {
      kind: body.kind,
      product: body.product,
    }
    if (body.email) payload.email = body.email
    if (typeof body.targetPrice === 'number') {
      payload.targetPrice = body.targetPrice
    }

    return await $fetch(`${config.apiBaseUrl}/product/alert`, {
      method: 'POST',
      body: payload,
      headers: {
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        'X-Forwarded-Host': config.public.djangoHostName,
        'X-Forwarded-Proto': 'https',
      },
    })
  }
  catch (error) {
    await handleError(error)
  }
})
