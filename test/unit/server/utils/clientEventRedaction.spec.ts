import { describe, expect, it } from 'vitest'
import { redactBody, redactClientEventError } from '~~/server/utils/clientEventRedaction'

/**
 * A field error often echoes what the customer typed, and a browser event
 * carries the whole response body of a failed call. Field names, stable
 * codes and the status are kept; every message and value is dropped.
 */
describe('redactBody', () => {
  it('keeps the field name of a DRF field error and drops its message and the value in it', () => {
    const redacted = redactBody({ email: ['x@y.z is taken'], phone: ['+30 6912345678 is not valid'] })

    expect(redacted).toEqual({ email: [], phone: [] })
    expect(JSON.stringify(redacted)).not.toMatch(/x@y\.z|6912345678|taken/)
  })

  it('keeps the codes, top-level and per field, and the field names of an allauth body', () => {
    const redacted = redactBody({
      status: 400,
      detail: 'Your address 5 Main St is not served.',
      code: 'not_served',
      errors: [{ code: 'email_taken', message: 'x@y.z is taken', param: 'email' }],
      fields: { phone: [{ message: '6912345678 is invalid', code: 'invalid_phone' }] },
    })

    expect(redacted).toEqual({
      status: 400,
      code: 'not_served',
      errors: [{ code: 'email_taken', param: 'email' }],
      fields: { phone: [{ code: 'invalid_phone' }] },
    })
  })

  it('drops a code that is prose, not an identifier, and any other string or number', () => {
    expect(redactBody({ code: 'x@y.z is taken', reason: 'out_of_stock', quantity: 5, name: 'Maria' }))
      .toEqual({ reason: 'out_of_stock' })
  })

  it('leaves nothing for a body that is a bare string', () => {
    expect(redactBody('x@y.z is taken')).toBeUndefined()
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

    expect(event.error).toMatchObject({ name: 'FetchError', status: 400, statusCode: 400, statusText: 'Bad Request', data: { email: [] } })
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

    expect(event.error).toEqual({ status: 400, errors: [{ code: 'email_taken', param: 'email' }] })
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
