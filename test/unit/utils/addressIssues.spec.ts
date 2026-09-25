import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { addressIssues } from '~~/shared/utils/postalCode'
import { addressIssueMessage, refineAddress } from '~/utils/addressIssues'

// ``addressIssues`` is a Nuxt auto-import in app code.
beforeAll(() => {
  vi.stubGlobal('addressIssues', addressIssues)
})

const GREECE = { postalCodePattern: '\\d{3} ?\\d{2}', postalCodeExample: '151 24' }

function t(key: string, named?: Record<string, unknown>) {
  return named ? `${key}:${JSON.stringify(named)}` : key
}

const schema = z.object({
  street: z.string(),
  streetNumber: z.string(),
  zipcode: z.string(),
}).superRefine((data, ctx) => refineAddress(ctx, GREECE, data, t))

describe('refineAddress', () => {
  it('puts each prod order #316 mistake on its own field', () => {
    const result = schema.safeParse({ street: '1', streetNumber: '70300', zipcode: 'ΑΒΓΔ' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map(issue => [issue.path.join('.'), issue.message])).toEqual([
      ['street', 'validation.street.no_letter'],
      ['streetNumber', 'validation.street_number.looks_like_postcode'],
      ['zipcode', 'validation.zipcode.invalid_example:{"example":"151 24"}'],
    ])
  })

  it('passes a correct address', () => {
    expect(schema.safeParse({ street: 'Εγνατίας', streetNumber: '12', zipcode: '546 22' }).success).toBe(true)
  })
})

describe('addressIssueMessage', () => {
  it('falls back to the generic postcode message without an example', () => {
    expect(addressIssueMessage('zipcode', { postalCodePattern: '\\d{5}' }, t)).toBe('validation.zipcode.invalid')
  })
})
