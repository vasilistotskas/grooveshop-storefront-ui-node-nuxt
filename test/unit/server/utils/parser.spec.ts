import { createError, H3Error } from 'h3'
import { describe, expect, it } from 'vitest'
import { z, ZodError } from 'zod'
import { isResponseContractError, parseDataAs } from '~~/server/utils/parser'

/**
 * Only the wrapper's own contract: what Zod does with a valid payload is
 * Zod's business, so the schemas here are the smallest that exercise it.
 */
const schema = z.object({ id: z.number(), name: z.string() })

async function failureOf(promise: Promise<unknown>): Promise<H3Error> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught)
  expect(error).toBeInstanceOf(H3Error)
  return error as H3Error
}

describe('parseDataAs', () => {
  it('returns the schema output, not the input (unknown keys stripped)', async () => {
    await expect(parseDataAs({ id: 1, name: 'a', extra: true }, schema)).resolves.toEqual({ id: 1, name: 'a' })
  })

  it('awaits a promise before parsing it', async () => {
    await expect(parseDataAs(Promise.resolve({ id: 1, name: 'a' }), schema)).resolves.toEqual({ id: 1, name: 'a' })
  })

  it('lets a rejected promise through untouched', async () => {
    const upstream = new Error('Fetch failed')

    await expect(parseDataAs(Promise.reject(upstream), schema)).rejects.toBe(upstream)
  })

  it('fails a drifted payload as 422 "Data parsing failed" carrying the ZodError', async () => {
    const error = await failureOf(parseDataAs({ id: 'x' }, schema))

    expect(error.statusCode).toBe(422)
    expect(error.statusMessage).toBe('Data parsing failed')
    expect(error.data).toBeInstanceOf(ZodError)
    expect((error.data as ZodError).issues.map(issue => issue.path.join('.'))).toEqual(['id', 'name'])
  })

  it('uses the status and message the caller passes', async () => {
    const error = await failureOf(parseDataAs({}, schema, 400, 'Bad Request'))

    expect(error.statusCode).toBe(400)
    expect(error.statusMessage).toBe('Bad Request')
  })
})

describe('isResponseContractError', () => {
  it('recognises a parseDataAs failure, whatever status it carries', async () => {
    expect(isResponseContractError(await failureOf(parseDataAs({}, schema)))).toBe(true)
    expect(isResponseContractError(await failureOf(parseDataAs({}, schema, 400)))).toBe(true)
  })

  it.each([
    ['an inbound-validation H3Error', createError({ statusCode: 400, data: new ZodError([]) })],
    ['a plain Error', new Error('x')],
    ['null', null],
    ['a string', 'boom'],
  ])('rejects %s', (_label, error) => {
    expect(isResponseContractError(error)).toBe(false)
  })

  it('keeps the brand non-enumerable, so a copied or serialised error does not carry it', async () => {
    const error = await failureOf(parseDataAs({}, schema))

    expect(isResponseContractError({ ...error })).toBe(false)
  })
})
