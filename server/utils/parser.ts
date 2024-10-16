import type { H3Event } from 'h3'
import type { ZodTypeAny } from 'zod'

const apiValidateWithSchema = <ZodSchema extends ZodTypeAny>(
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
 * Parse the body of a `h3` event.
 *
 * Cookies are part of the HTTP standard and may be sent with a request.
 *
 * @param {H3Event} event - Input to parse using the passed `schema`
 * @param {ZodTypeAny} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
async function parseBodyAs<ZodSchema extends ZodTypeAny>(
  event: H3Event,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Body parsing failed',
) {
  const data = await readBody(event)
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
}

/**
 * Parse the parameters of a `h3` event.
 *
 * For example `/[test].get.ts` binds the parameter `test` to a value, for example `/1` then results in `test = 1`
 *
 * @param {H3Event} event - Input to parse using the passed `schema`
 * @param {ZodTypeAny} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
function parseParamsAs<ZodSchema extends ZodTypeAny>(
  event: H3Event,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Parameter parsing failed',
) {
  const data = event.context.params
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
}

/**
 * Parse the query of a `h3` event.
 *
 * For example `/bar?sort=ASC` binds the query value `sort = "ASC"`
 *
 * @param {H3Event} event - Input to parse using the passed `schema`
 * @param {ZodTypeAny} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
function parseQueryAs<ZodSchema extends ZodTypeAny>(
  event: H3Event,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Query parsing failed',
) {
  const data = getQuery(event)
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
}

/**
 * Parse the cookies of a `h3` event.
 *
 * Cookies are part of the HTTP standard and send with every request.
 *
 * @param {H3Event} event - Input to parse using the passed `schema`
 * @param {ZodTypeAny} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
function parseCookieAs<ZodSchema extends ZodTypeAny>(
  event: H3Event,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Cookie parsing failed',
) {
  const data = parseCookies(event)
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
}

/**
 * Parse the headers of a `h3` event.
 *
 * Cookies are part of the HTTP standard and send with every request.
 *
 * @param {H3Event} event - Input to parse using the passed `schema`
 * @param {ZodTypeAny} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
function parseHeaderAs<ZodSchema extends ZodTypeAny>(
  event: H3Event,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Header parsing failed',
) {
  const data = getHeaders(event)
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
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
 * console.log(parsedData)
 * // -> output: `1` (as a number, as `z` also deserializes)
 * ```
 *
 * Also works with async data, e.g., when fetching from another API or DB:
 * ```
 * const fakeDatabaseQuery = async () => { test: "1" }
 * const parsedData = await parseDataAs(fakeDatabaseQuery, object({ test: number() )}))
 *
 * console.log(parsedData)
 * // -> output: `1` (as a number, as `z` also deserializes)
 * ```
 *
 * @param {any | Promise<any>} dataOrPromise - Input to parse using the passed `schema`
 * @param {ZodTypeAny} schema - Error code of error if parsing fails
 * @param {string} [errorCode=422] - Optional error message if parsing fails
 * @param {string} [errorMessage="Data parsing failed"] - Optional error message if parsing fails
 */
async function parseDataAs<ZodSchema extends ZodTypeAny>(
  dataOrPromise: any | Promise<any>,
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Data parsing failed',
) {
  const data = await dataOrPromise
  return apiValidateWithSchema(data, schema, errorCode, errorMessage)
}

/**
 * Make a data transformer based on a schema. All data passed into it will be turned into data of that schema (or the transformer will throw during parsing)
 * This method will throw an exception (like 422 unprocessable Entity) if data validation fails. The error code and message can be customized.
 * @param {ZodTypeAny} schema - message to return to client if parsing and validating `D` fails
 * @param {number} errorCode - error code of error if parsing fails
 * @param {string} errorMessage - error message if parsing fails
 *
 * The function throws if a data-promise is passed in and the promise rejects.
 *
 * The returned parser can then be used like this:
 * ```ts
 * const transform = makeParser(object({
 *  createdAt: date()
 * }))
 *
 * const { data } = useFetch('/example/1', { transform })
 *
 * console.log(data.createdAt)
 * // -> output: `Date Tue Sep 06 2022 14:20:45 GMT+0200 (Central European Summer Time)`
 *
 * console.log(typeof data.createdAt)
 * // -> output: `object` (this is a parsed date, not a date string!)
 * ```
 */
function makeParser<ZodSchema extends ZodTypeAny>(
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Data parsing failed',
) {
  return (
    data: any,
    errorCodeOverwrite = undefined,
    errorMessageOverwrite = undefined,
  ) => {
    return apiValidateWithSchema(
      data,
      schema,
      errorCodeOverwrite || errorCode,
      errorMessageOverwrite || errorMessage,
    )
  }
}

/**
 * Make a data transformer based on a schema. All data passed into it will be turned into data of that schema (or the transformer will throw during parsing)
 * This method will throw an exception (like 422 Unprocessable Entity) if data validation fails. The error code and message can be customized.
 * @param {ZodTypeAny} schema - message to return to client if parsing and validating `D` fails
 * @param {number} errorCode - error code of error if parsing fails
 * @param {string} errorMessage - error message if parsing fails
 *
 * The function throws if a data-promise is passed in and the promise rejects.
 *
 * The returned parser can then be used like this:
 * ```ts
 * const parseDbPromise = makeParser(object({
 *  createdAt: date()
 * }))
 *
 * const fakeDatabaseQuery = async () => { test: "1" }
 *
 * const data = await parseDbPromise(fakeDatabaseQuery)
 *
 * console.log(parsedData)
 * // -> output: `1` (as a number, as `z` also deserializes)
 * ```
 */
function makePromiseParser<ZodSchema extends ZodTypeAny>(
  schema: ZodSchema,
  errorCode = 422,
  errorMessage = 'Data-promise parsing failed',
) {
  return async (
    promise: Promise<any>,
    errorCodeOverwrite = undefined,
    errorMessageOverwrite = undefined,
  ) => {
    const data = await promise
    return apiValidateWithSchema(
      data,
      schema,
      errorCodeOverwrite || errorCode,
      errorMessageOverwrite || errorMessage,
    )
  }
}

export {
  makeParser,
  makePromiseParser,
  parseBodyAs,
  parseCookieAs,
  parseDataAs,
  parseHeaderAs,
  parseParamsAs,
  parseQueryAs,
}
