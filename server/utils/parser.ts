import type { ZodType } from 'zod'
import { createError } from 'h3'

const apiValidateWithSchema = <ZodSchema extends ZodType>(
  data: any,
  schema: ZodSchema,
  statusCode: number,
  statusMessage: string,
) => {
  try {
    return schema.parse(data)
  }
  catch (error) {
    throw createError({
      statusCode,
      statusMessage,
      data: error,
    })
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
 * @param {any | Promise<any>} dataOrPromise - Input to parse using the passed `schema`
 * @param {ZodType} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
async function parseDataAs<ZodSchema extends ZodType>(
  dataOrPromise: any | Promise<any>,
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
