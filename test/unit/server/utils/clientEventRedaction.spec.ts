import { describe, expect, it } from 'vitest'
import { REDACTED_BODY, redactBody, redactClientEventError } from '~~/server/utils/clientEventRedaction'

/**
 * A field error often echoes what the customer typed, and a browser event
 * carries the whole response body of a failed call. The rule is an
 * allowlist: field names, identifier codes and an HTTP status survive;
 * everything else is replaced, whatever its type.
 */
describe('redactBody', () => {
  it('keeps the field name of a DRF field error and replaces its message and the value in it', () => {
    const redacted = redactBody({ email: ['x@y.z is taken'], phone: ['+30 6912345678 is not valid'] })

    expect(redacted).toEqual({ email: [REDACTED_BODY], phone: [REDACTED_BODY] })
    expect(JSON.stringify(redacted)).not.toMatch(/x@y\.z|6912345678|taken/)
  })

  it('keeps the codes, top-level and per field, the field names and the status of an error body', () => {
    const redacted = redactBody({
      status: 400,
      detail: 'Your address 5 Main St is not served.',
      code: 'not_served',
      errors: [{ code: 'email_taken', message: 'x@y.z is taken', param: 'email' }],
      fields: { phone: [{ message: '6912345678 is invalid', code: 'invalidPhone' }] },
    })

    expect(redacted).toEqual({
      status: 400,
      detail: REDACTED_BODY,
      code: 'not_served',
      errors: [{ code: 'email_taken', message: REDACTED_BODY, param: 'email' }],
      fields: { phone: [{ message: REDACTED_BODY, code: 'invalidPhone' }] },
    })
  })

  /** Every JS type a value can have, in the places a code or a status is allowed to sit. */
  const VALUES: Array<[string, unknown]> = [
    ['a string with an email', 'x@y.z is taken'],
    ['a string that is a phone number', '+30 6912345678'],
    ['a string that is a postcode', '151 24'],
    ['a numeric string', '15124'],
    ['an identifier-shaped name', 'Maria'],
    ['a number', 6912345678],
    ['a postcode as a number', 15124],
    ['a float', 3.14],
    ['a negative number', -1],
    ['true', true],
    ['false', false],
    ['a bigint', 6912345678n],
    ['null', null],
    ['a list of strings', ['x@y.z']],
    ['a list of numbers', [15124, 6912345678]],
    ['an object of values', { street: '5 Main St', zip: 15124 }],
  ]

  it.each(VALUES)('replaces %s wherever the allowlist does not name it', (_label, value) => {
    const redacted = redactBody({ street: value, quantity: value, detail: value, message: value, data: value })
    const text = JSON.stringify(redacted, (_key, v) => typeof v === 'bigint' ? `${v}n` : v)

    expect(text).not.toMatch(/x@y\.z|6912345678|15124|151 24|Main St|Maria|3\.14|true|false|\b-1\b/)
  })

  it.each(VALUES.filter(([, value]) => typeof value !== 'string' || /[\s@+]|^\d/.test(value)))(
    'drops %s from a place a code or a status is allowed, because it is not one',
    (_label, value) => {
      const redacted = redactBody({ code: value, reason: value, type: value, param: value, status: value, statusCode: value, statusText: value }) as Record<string, unknown>

      for (const key of ['code', 'reason', 'type', 'param', 'status', 'statusCode', 'statusText']) {
        expect(redacted[key]).not.toBe(value)
      }
    },
  )

  it('keeps what the allowlist names, only in its place', () => {
    expect(redactBody({ code: 'out_of_stock', reason: 'minOrder', type: 'invalid', param: 'email', status: 409, statusCode: 404, statusText: 'Not Found' }))
      .toEqual({ code: 'out_of_stock', reason: 'minOrder', type: 'invalid', param: 'email', status: 409, statusCode: 404, statusText: 'Not Found' })
    // The same words anywhere else are values.
    expect(redactBody({ street: 'out_of_stock', zip: 409 })).toEqual({ street: REDACTED_BODY, zip: REDACTED_BODY })
  })

  it.each([[99], [600], [1.5], [NaN]])('drops %s as a status: not an HTTP status', (status) => {
    expect((redactBody({ status }) as Record<string, unknown>).status).toBe(REDACTED_BODY)
  })

  it('drops a key that is data, not a field name', () => {
    expect(redactBody({ 'x@y.z': ['is taken'], 'ok_field': ['m'], ['a'.repeat(65)]: ['m'] })).toEqual({ ok_field: [REDACTED_BODY] })
  })

  it('replaces a body nested deeper than it walks', () => {
    let body: Record<string, unknown> = { leaf: 'x@y.z' }
    for (let i = 0; i < 10; i++) body = { next: body }

    expect(JSON.stringify(redactBody(body))).not.toContain('x@y.z')
  })

  it('replaces a bare string, number or list', () => {
    expect(redactBody('x@y.z is taken')).toBe(REDACTED_BODY)
    expect(redactBody(15124)).toBe(REDACTED_BODY)
    expect(redactBody(['x@y.z'])).toEqual([REDACTED_BODY])
  })
})

describe('redactClientEventError', () => {
  const serializedFetchError = (data: unknown) => ({
    name: 'FetchError',
    message: '[POST] "/api/user": 400 Bad Request',
    stack: 'FetchError: ...',
    status: 400,
    statusCode: 400,
    statusText: 'Bad Request',
    data,
  })

  it('logs a FetchError with the field name but without the value in its data', () => {
    const event: Record<string, unknown> = {
      action: 'account:update',
      requestId: 'req-1',
      error: serializedFetchError({ email: ['x@y.z is taken'] }),
    }

    redactClientEventError(event)

    expect(event.error).toMatchObject({ name: 'FetchError', status: 400, statusCode: 400, statusText: 'Bad Request', data: { email: [REDACTED_BODY] } })
    expect(event.requestId).toBe('req-1')
    expect(JSON.stringify(event)).not.toMatch(/x@y\.z|taken/)
  })

  it('redacts the data of a cause too', () => {
    const event: Record<string, unknown> = { error: { ...serializedFetchError(undefined), cause: serializedFetchError({ email: ['x@y.z is taken'] }) } }

    redactClientEventError(event)

    expect(JSON.stringify(event)).not.toMatch(/x@y\.z/)
  })

  it('redacts a body a site logs itself as the error (error: error.data)', () => {
    const event: Record<string, unknown> = { error: { status: 400, errors: [{ code: 'email_taken', message: 'x@y.z is taken', param: 'email' }] } }

    redactClientEventError(event)

    expect(event.error).toEqual({ status: 400, errors: [{ code: 'email_taken', message: REDACTED_BODY, param: 'email' }] })
  })

  it.each([
    ['a plain-text echo', 'Unknown user x@y.z, call +30 6912345678'],
    ['an HTML error page', '<html><body>No account for x@y.z</body></html>'],
    ['a number', 6912345678],
    ['a postcode as a number', 15124],
    ['true', true],
    ['a bigint', 6912345678n],
    ['null', null],
    ['a list of messages', ['x@y.z is taken']],
  ])('replaces %s logged as the error with a marker, never its content', (_label, body) => {
    const event: Record<string, unknown> = { action: 'a', error: body }

    redactClientEventError(event)

    expect(event.error).toBe(REDACTED_BODY)
  })

  it.each([
    ['a string', 'Unknown user x@y.z'],
    ['a number', 6912345678],
    ['a boolean', true],
    ['a list', ['x@y.z']],
  ])('redacts %s as the `data` of a serialized error', (_label, data) => {
    const event: Record<string, unknown> = { error: { name: 'FetchError', message: 'm', data } }

    redactClientEventError(event)

    expect(JSON.stringify(event)).not.toMatch(/x@y\.z|6912345678|true/)
  })

  it('leaves an event with no error, and an error with no data, alone', () => {
    const plain: Record<string, unknown> = { tag: 'cart', message: 'ok' }
    const noData: Record<string, unknown> = { error: { name: 'TypeError', message: 'cart is undefined', stack: 'x' } }

    redactClientEventError(plain)
    redactClientEventError(noData)

    expect(plain).toEqual({ tag: 'cart', message: 'ok' })
    expect(noData).toEqual({ error: { name: 'TypeError', message: 'cart is undefined', stack: 'x' } })
  })
})
