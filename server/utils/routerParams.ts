import type { output, ZodType } from 'zod'
import { createError, getRouterParams } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

const VALIDATION_FAILED = 'Validation failed'

/**
 * The 400 for a malformed request, in the shape `nuxt/server`'s own
 * validators throw and `handleError` recognises by its `data.issues`.
 */
export function requestValidationError(issues: readonly unknown[]) {
  return createError({
    status: 400,
    statusText: VALIDATION_FAILED,
    message: VALIDATION_FAILED,
    data: { issues, message: VALIDATION_FAILED },
  })
}

/**
 * The route's dynamic segments, decoded and parsed by `schema`.
 *
 * `nuxt/server` validates the query and the body (`getValidatedQuery`,
 * `readValidatedBody`) but not the route params, so this is that third
 * reader, failing the same way theirs do: a 400 whose `data.issues` lists
 * what failed. The segments are decoded, as h3 v1 under Nitro 2 handed
 * them over; `nuxt/server` returns them as they appear in the URL unless
 * asked.
 */
export async function parseRouterParams<Schema extends ZodType>(
  event: RequestEvent,
  schema: Schema,
): Promise<output<Schema>> {
  const result = await schema.safeParseAsync(getRouterParams(event, { decode: true }))
  if (!result.success) throw requestValidationError(result.error.issues)
  return result.data
}
