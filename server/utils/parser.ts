import type { ZodType } from 'zod'
import { createError } from 'h3'

/**
 * Brand for "the payload we RECEIVED failed its schema".
 *
 * A malformed request and a drifted response both surface as a 4xx
 * `H3Error` carrying a `ZodError`, so `isClientError` cannot tell them
 * apart — yet they are opposites. A malformed request is the caller's
 * problem: every one in the 2026-09-08 production audit came from a bot
 * probing `?page=gravitysmtp-settings`. A response that fails its schema
 * means Django and the generated client have drifted, which is our
 * fault, and it is often the only signal a shopper's broken page emits —
 * the non-nullable `weightInfo` contract 422'd every add-to-cart for a
 * zero-weight product until django v3.29.3, and both this module and
 * the evlog level plugin reported it as client behaviour because 422
 * is a 4xx.
 *
 * A symbol rather than a field on `data`: `data` is the `ZodError`
 * itself (callers read it, and Nitro strips it from thrown responses in
 * production), so a non-enumerable symbol cannot collide with it or
 * leak onto the wire.
 */
const RESPONSE_CONTRACT = Symbol('responseContract')

/** True when `error` came from {@link parseDataAs} — see {@link RESPONSE_CONTRACT}. */
export function isResponseContractError(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && RESPONSE_CONTRACT in error
  )
}

const apiValidateWithSchema = <ZodSchema extends ZodType>(
  data: unknown,
  schema: ZodSchema,
  statusCode: number,
  statusMessage: string,
) => {
  try {
    return schema.parse(data)
  }
  catch (error) {
    const failure = createError({
      statusCode,
      statusMessage,
      data: error,
    })
    Object.defineProperty(failure, RESPONSE_CONTRACT, { value: true })
    throw failure
  }
}

/**
 * Parse arbitrary data or promise returning data using a schema.
 *
 * The function throws if a data-promise is passed in and the promise rejects.
 *
 * E.g.:
 * ```
 * const parsedData = await parseDataAs({ test: "1" }, object({ test: number() )}))
 *
 * console.info(parsedData)
 * // -> output: `1` (as a number, as `z` also deserializes)
 * ```
 *
 * Also works with async data, e.g., when fetching from another API or DB:
 * ```
 * const fakeDatabaseQuery = async () => { test: "1" }
 * const parsedData = await parseDataAs(fakeDatabaseQuery, object({ test: number() )}))
 *
 * console.info(parsedData)
 * // -> output: `1` (as a number, as `z` also deserializes)
 * ```
 *
 * @param {unknown | Promise<unknown>} dataOrPromise - Input to parse using the passed `schema`
 * @param {ZodType} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
async function parseDataAs<ZodSchema extends ZodType>(
  dataOrPromise: unknown | Promise<unknown>,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Data parsing failed',
) {
  const data = await dataOrPromise
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
}

export {
  parseDataAs,
}
