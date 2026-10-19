/**
 * What the shopper is told about a failed `/api` call, and what a form can
 * mark inline, from whatever the call rejected with.
 *
 * Django's error body is the source (`docs/error-contract.md` in the Django
 * repo): `detail` or the field keys, a stable `code`, and for validation
 * `fields` (`{ field: [{ message, code }] }`, nested like the serializer).
 * That body is `error.data`, whichever route was called (allauth's flows
 * wrap theirs, see `apiErrorBodyOf`).
 *
 * Text, in priority: an i18n entry for the code (`errors.codes.<code>`),
 * then Django's own message (already in the page's language), then a
 * generic line, which is "something went wrong on our side" for a 5xx or
 * a call that got no answer and "not accepted" otherwise. Never
 * `error.message` or `statusMessage`: those are English transport text.
 */
export interface ApiFieldError {
  /** The form field path, dotted for nested serializers (`items.1.quantity`). */
  name: string
  message: string
  code?: string
}

export interface DescribedApiError {
  /** The headline: what the action was, from the caller; the generic error title otherwise. */
  title: string
  /** The reason, in the page's language. Never empty. */
  description: string
  /** Django's stable code: `code`, else `reason` / `error.type`, else the first allauth error's. */
  code?: string
  /** The per-field errors, for `UForm.setErrors`. Empty when the body names no field. */
  fieldErrors: ApiFieldError[]
  /** The id of the failed request, to quote to support (`x-request-id`). */
  requestId?: string
  status?: number
  /** Whether the server (or the network) failed, as opposed to refusing the request. */
  serverFault: boolean
}

export interface DescribeApiErrorOptions {
  /** The action's headline («Η κριτική δεν δημιουργήθηκε»). */
  title?: string
  /**
   * A reason the component knows better than Django's message: a typed
   * refusal that comes with what to do next. It outranks Django's sentence
   * but not the text mapped to the code.
   */
  reason?: string
  /** What to say when the body explains nothing; replaces the generic line. */
  fallback?: string
}

export interface ApiErrorI18n {
  t: (key: string, params?: Record<string, unknown>) => string
  te: (key: string) => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const stringOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined

/** The status of a failed call: ofetch's, a thrown route error's, or the response's. */
function statusOf(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined
  for (const key of ['status', 'statusCode']) {
    if (typeof error[key] === 'number') return error[key]
  }
  const response = error.response
  return isRecord(response) && typeof response.status === 'number' ? response.status : undefined
}

/**
 * The body of a failed call: `error.data`. Every `/api` route forwards
 * Django's body as it came (`handleError`), so a component never knows
 * which route it called. The one exception is allauth's flows, which answer
 * `{ statusCode, statusMessage, data: <allauth body> }` (`forwardAllAuthFlow`,
 * `handleAllAuthError`): the wrapper's numeric `statusCode` beside an
 * allauth body's numeric `status`, which no Django body has, so a Django body
 * that merely holds a `data` object is never mistaken for it. A string body
 * (an error page, a text echo) is no body.
 */
export function apiErrorBodyOf(error: unknown): Record<string, unknown> | undefined {
  if (!isRecord(error)) return undefined
  const data = error.data
  if (!isRecord(data)) return undefined
  const allAuthBody = data.data
  if (typeof data.statusCode === 'number' && isRecord(allAuthBody) && typeof allAuthBody.status === 'number') return allAuthBody
  return data
}

function fieldLeaves(value: unknown, path: string[], out: ApiFieldError[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isRecord(item) && typeof item.message === 'string') {
        out.push({ name: path.join('.'), message: item.message, ...(stringOf(item.code) ? { code: String(item.code) } : {}) })
      }
      else if (isRecord(item) || Array.isArray(item)) {
        fieldLeaves(item, path, out)
      }
    }
    return
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) fieldLeaves(child, [...path, key], out)
  }
}

/** Keys of a legacy DRF body that are not field names. */
const NON_FIELD_KEYS = new Set(['detail', 'code', 'fields', 'reason', 'error', 'nonFieldErrors', 'status'])

function fieldErrorsOf(body: Record<string, unknown>): ApiFieldError[] {
  const out: ApiFieldError[] = []
  if (isRecord(body.fields)) {
    fieldLeaves(body.fields, [], out)
    return out
  }
  // allauth: `errors: [{ code, message, param }]`.
  if (Array.isArray(body.errors)) {
    for (const entry of body.errors) {
      if (isRecord(entry) && typeof entry.param === 'string' && typeof entry.message === 'string') {
        out.push({ name: entry.param, message: entry.message, ...(stringOf(entry.code) ? { code: String(entry.code) } : {}) })
      }
    }
    return out
  }
  // A body from before `fields`: `{ field: ['message'] }`.
  for (const [key, value] of Object.entries(body)) {
    if (NON_FIELD_KEYS.has(key) || !Array.isArray(value)) continue
    for (const message of value) {
      if (typeof message === 'string') out.push({ name: key, message })
    }
  }
  return out
}

function codeOf(body: Record<string, unknown>): string | undefined {
  const own = stringOf(body.code) ?? stringOf(body.reason)
  if (own) return own
  if (isRecord(body.error)) return stringOf(body.error.type)
  if (Array.isArray(body.errors) && isRecord(body.errors[0])) return stringOf(body.errors[0].code)
  return undefined
}

/** Django's own sentence for the failure, whichever key carried it. */
function messageOf(body: Record<string, unknown>, fieldErrors: ApiFieldError[]): string | undefined {
  const detail = stringOf(body.detail)
  if (detail) return detail
  const nonField = body.nonFieldErrors
  if (Array.isArray(nonField) && nonField.some(item => typeof item === 'string')) {
    return nonField.filter(item => typeof item === 'string').join(' ')
  }
  if (Array.isArray(body.errors) && isRecord(body.errors[0]) && !fieldErrors.length) {
    return stringOf(body.errors[0].message)
  }
  return fieldErrors[0]?.message
}

export function describeApiErrorWith(
  error: unknown,
  { t, te }: ApiErrorI18n,
  options: DescribeApiErrorOptions = {},
): DescribedApiError {
  const status = statusOf(error)
  const body = apiErrorBodyOf(error)
  const code = body ? codeOf(body) : undefined
  const mapped = (c: string | undefined) => (c && te(`errors.codes.${c}`) ? t(`errors.codes.${c}`) : undefined)

  const rawFieldErrors = body ? fieldErrorsOf(body) : []
  const fieldErrors = rawFieldErrors.map(entry => ({ ...entry, message: mapped(entry.code) ?? entry.message }))

  // A call with no answer has no status; a 5xx is ours to fix, not the shopper's.
  const serverFault = status === undefined || status >= 500
  const generic = serverFault ? t('error.server') : t('error.rejected')
  const rateLimited = status === 429 ? t('error.rate_limited') : undefined

  const description = mapped(code)
    ?? options.reason
    ?? (body ? messageOf(body, fieldErrors) : undefined)
    ?? options.fallback
    ?? rateLimited
    ?? generic

  const requestId = requestIdOf(error) ?? (isRecord(error) ? stringOf(error.requestId) : undefined)
  return {
    title: options.title ?? t('error.default'),
    description,
    ...(code ? { code } : {}),
    fieldErrors,
    ...(requestId ? { requestId } : {}),
    ...(status !== undefined ? { status } : {}),
    serverFault,
  }
}

/** `describeApiErrorWith` in the page's language. */
export function describeApiError(error: unknown, options: DescribeApiErrorOptions = {}): DescribedApiError {
  const { t, te } = useNuxtApp().$i18n
  return describeApiErrorWith(error, { t: (key, params) => t(key, params ?? {}), te: key => te(key) }, options)
}
