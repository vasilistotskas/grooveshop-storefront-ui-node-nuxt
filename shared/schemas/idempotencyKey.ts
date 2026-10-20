import { z } from 'zod'

/**
 * The header a retried request carries so Django answers it with the
 * first outcome instead of running it again
 * (`core/middleware/idempotency.py` in the Django API).
 */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'

/**
 * One checkout attempt's key: the browser mints it with
 * `crypto.randomUUID()`. Validated on the way through the Nitro proxy so
 * a malformed value never becomes a key in Django's cache.
 */
export const zIdempotencyKey = z.uuid()
