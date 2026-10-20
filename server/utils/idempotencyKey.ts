import { getRequestHeader } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * The `Idempotency-Key` header to forward to Django for a request that
 * creates something (an order, a payment intent): the key the browser
 * minted for this checkout attempt, or no header when it sent none.
 *
 * Django replays the first outcome for a repeated key, so a double
 * submit or a retry after a dropped connection cannot create a second
 * order. A key that is not a UUID is a malformed request: a 400, like
 * the other request validators, never forwarded.
 */
export function idempotencyKeyHeaders(event: RequestEvent): Record<string, string> {
  const sent = getRequestHeader(event, IDEMPOTENCY_KEY_HEADER)
  if (sent === undefined) return {}
  const result = zIdempotencyKey.safeParse(sent)
  if (!result.success) throw requestValidationError(result.error.issues)
  return { [IDEMPOTENCY_KEY_HEADER]: result.data }
}
