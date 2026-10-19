import { describe, expect, it } from 'vitest'
import { apiErrorBodyOf, describeApiErrorWith } from '~/utils/apiError'

const MESSAGES: Record<string, string> = {
  'error.default': 'Σφάλμα',
  'error.server': 'Κάτι πήγε στραβά από τη δική μας πλευρά.',
  'error.rejected': 'Το αίτημα δεν έγινε δεκτό.',
  'error.rate_limited': 'Πολλές αιτήσεις.',
  'errors.codes.must_have_purchased': 'Μόνο για προϊόντα που αγόρασες.',
}
const i18n = { t: (key: string) => MESSAGES[key] ?? key, te: (key: string) => key in MESSAGES }
const describe_ = (error: unknown, title?: string) => describeApiErrorWith(error, i18n, { title })

/** A forwarded Django body: `error.data` is the body. */
const forwarded = (status: number, data: unknown) => ({ status, data })
/** An allauth flow's error: its body sits under the wrapper the allauth routes throw. */
const allAuthThrown = (status: number, data: unknown) => ({ status, data: { statusCode: status, statusMessage: 'Bad Request', data } })

describe('apiErrorBodyOf', () => {
  it('reads Django\'s body at error.data', () => {
    const body = { detail: 'No.', code: 'nope' }

    expect(apiErrorBodyOf(forwarded(400, body))).toEqual(body)
  })

  it('reads an allauth body from under the wrapper its routes throw', () => {
    const body = { status: 400, errors: [{ code: 'invalid', message: 'No.', param: 'email' }] }

    expect(apiErrorBodyOf(allAuthThrown(400, body))).toEqual(body)
  })

  it.each([
    ['a `data` key', { detail: 'No.', data: { status: 'x' } }],
    // Shaped like an allauth body inside, but Django's: no wrapper around it.
    ['a `data` object with a numeric `status`', { detail: 'No.', code: 'nope', data: { status: 400 } }],
  ])('does not unwrap a Django body that merely has %s', (_case, body) => {
    expect(apiErrorBodyOf(forwarded(400, body))).toEqual(body)
  })

  it.each([
    ['an error with no body', { status: 502, data: undefined }],
    ['an HTML error page', { status: 502, data: '<html>Bad gateway</html>' }],
    ['a network failure', new TypeError('Failed to fetch')],
    ['null', null],
  ])('finds no body in %s', (_label, error) => {
    expect(apiErrorBodyOf(error)).toBeUndefined()
  })
})

describe('describeApiErrorWith', () => {
  it('takes the message and code of Django from the body', () => {
    const described = describe_(forwarded(400, { detail: 'Το καλάθι είναι άδειο.', code: 'cart_empty' }), 'Η παραγγελία δεν δημιουργήθηκε')

    expect(described).toMatchObject({
      title: 'Η παραγγελία δεν δημιουργήθηκε',
      description: 'Το καλάθι είναι άδειο.',
      code: 'cart_empty',
      status: 400,
      serverFault: false,
    })
  })

  it('prefers the text mapped to the code over Django\'s message', () => {
    const described = describe_(forwarded(400, { product: 'raw sentence', code: 'must_have_purchased', fields: { product: [{ message: 'raw sentence', code: 'must_have_purchased' }] } }))

    expect(described.description).toBe('Μόνο για προϊόντα που αγόρασες.')
    expect(described.code).toBe('must_have_purchased')
    expect(described.fieldErrors).toEqual([{ name: 'product', message: 'Μόνο για προϊόντα που αγόρασες.', code: 'must_have_purchased' }])
  })

  it('prefers the text mapped to the code over the detail Django sent', () => {
    const described = describe_(forwarded(400, { detail: 'You must have bought it.', code: 'must_have_purchased' }))

    expect(described.description).toBe('Μόνο για προϊόντα που αγόρασες.')
  })

  it('prefers the reason the component knows over the sentence of Django, but not over the mapped code', () => {
    const body = { detail: 'Generic refusal.', code: 'parcel_with_courier' }

    expect(describeApiErrorWith(forwarded(409, body), i18n, { reason: 'Επικοινώνησε μαζί μας.' }).description).toBe('Επικοινώνησε μαζί μας.')
    expect(describeApiErrorWith(forwarded(409, { ...body, code: 'must_have_purchased' }), i18n, { reason: 'Επικοινώνησε μαζί μας.' }).description).toBe('Μόνο για προϊόντα που αγόρασες.')
  })

  it('puts the fallback of the caller before the generic line, and the sentence of Django before the fallback', () => {
    expect(describeApiErrorWith(forwarded(500, undefined), i18n, { fallback: 'Δεν στάλθηκε.' }).description).toBe('Δεν στάλθηκε.')
    expect(describeApiErrorWith(forwarded(400, { detail: 'Άδειο.' }), i18n, { fallback: 'Δεν στάλθηκε.' }).description).toBe('Άδειο.')
  })

  it('uses the first field message as the reason when the body has no detail', () => {
    const described = describe_(forwarded(400, { fields: { email: [{ message: 'Υπάρχει ήδη.', code: 'unique' }] }, code: 'unique' }))

    expect(described.description).toBe('Υπάρχει ήδη.')
  })

  it('names nested fields by their path, a many=True row by its position', () => {
    const described = describe_(forwarded(400, { fields: { items: { 1: { quantity: [{ message: 'Πολύ μικρή.', code: 'min_value' }] } } } }))

    expect(described.fieldErrors).toEqual([{ name: 'items.1.quantity', message: 'Πολύ μικρή.', code: 'min_value' }])
  })

  it('flattens every shape ApiFieldErrors allows: rows by position, a list of rows, nesting inside nesting', () => {
    const message = (text: string) => ({ message: text, code: 'invalid' })
    const described = describe_(forwarded(400, {
      code: 'invalid',
      fields: {
        items: { 0: { quantity: [message('A')] }, 2: { options: { 1: { value: [message('B')] } } } },
        lines: [[message('C')], { sku: [message('D')] }],
        email: [message('E')],
      },
    }))

    expect(described.fieldErrors.map(entry => [entry.name, entry.message])).toEqual([
      ['items.0.quantity', 'A'],
      ['items.2.options.1.value', 'B'],
      ['lines', 'C'],
      ['lines.sku', 'D'],
      ['email', 'E'],
    ])
  })

  it('reads a legacy field map that has no `fields`', () => {
    const described = describe_(forwarded(400, { phone: ['Άκυρο τηλέφωνο.'], nonFieldErrors: ['Δεν γίνεται.'] }))

    expect(described.fieldErrors).toEqual([{ name: 'phone', message: 'Άκυρο τηλέφωνο.' }])
    expect(described.description).toBe('Δεν γίνεται.')
  })

  it('reads allauth\'s errors: the param is the field, the code the code', () => {
    const described = describe_(allAuthThrown(400, { status: 400, errors: [{ code: 'email_taken', message: 'Το email υπάρχει.', param: 'email' }] }))

    expect(described).toMatchObject({ code: 'email_taken', description: 'Το email υπάρχει.' })
    expect(described.fieldErrors).toEqual([{ name: 'email', message: 'Το email υπάρχει.', code: 'email_taken' }])
  })

  it('reads the code a reason or an order error type carries', () => {
    expect(describe_(forwarded(409, { detail: 'x', reason: 'out_of_stock' })).code).toBe('out_of_stock')
    expect(describe_(forwarded(400, { detail: 'x', error: { type: 'min_order_not_met' } })).code).toBe('min_order_not_met')
  })

  it.each([
    ['a 500', forwarded(500, undefined), true],
    ['a 502 that carried nothing', { status: 502, data: { statusCode: 502, statusMessage: 'Bad Gateway' } }, true],
    ['a call that got no answer', new TypeError('Failed to fetch'), true],
  ])('says it is on our side for %s', (_label, error, serverFault) => {
    const described = describe_(error)

    expect(described.serverFault).toBe(serverFault)
    expect(described.description).toBe('Κάτι πήγε στραβά από τη δική μας πλευρά.')
  })

  it('says the request was not accepted for a 4xx that explains nothing', () => {
    expect(describe_(forwarded(400, {})).description).toBe('Το αίτημα δεν έγινε δεκτό.')
  })

  it('says to slow down on a 429 with no message of its own', () => {
    expect(describe_({ status: 429, data: { statusCode: 429, statusMessage: 'Too Many Requests' } }).description).toBe('Πολλές αιτήσεις.')
  })

  it('never shows transport text: error.message and statusMessage', () => {
    const error = Object.assign(new Error('[POST] "/api/x": 400 Bad Request'), { ...forwarded(400, undefined), statusMessage: 'Bad Request' })

    expect(describe_(error).description).not.toMatch(/POST|Bad Request/)
  })

  it('carries the request id of the failed response', () => {
    const error = { ...forwarded(400, { detail: 'No.' }), response: { headers: new Headers({ 'x-request-id': 'req-9' }) } }

    expect(describe_(error).requestId).toBe('req-9')
  })

  it('titles with the generic error headline when the action gives none', () => {
    expect(describe_(forwarded(400, { detail: 'No.' })).title).toBe('Σφάλμα')
  })
})
