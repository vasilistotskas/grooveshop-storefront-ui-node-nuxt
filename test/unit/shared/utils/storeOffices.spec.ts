import { describe, expect, it } from 'vitest'
import { formatOfficeAddress } from '~~/shared/utils/storeOffices'

const OFFICE = {
  street: 'Γ. Ρίτσου 7',
  area: 'Καλαμαριά',
  postal: '551 32',
  city: 'Θεσσαλονίκη',
}

describe('formatOfficeAddress', () => {
  it('writes the address the way the artboard prints it', () => {
    // `street, area postal, city` — the postcode rides with the AREA,
    // which is how a Greek address is written.
    expect(formatOfficeAddress(OFFICE)).toBe(
      'Γ. Ρίτσου 7, Καλαμαριά 551 32, Θεσσαλονίκη',
    )
  })

  it('drops the parts an office does not carry', () => {
    expect(formatOfficeAddress({ street: 'Ιλισίων 23' })).toBe('Ιλισίων 23')
    expect(
      formatOfficeAddress({ street: 'Ιλισίων 23', city: 'Αττική' }),
    ).toBe('Ιλισίων 23, Αττική')
    expect(
      formatOfficeAddress({ street: 'Ιλισίων 23', postal: '157 71' }),
    ).toBe('Ιλισίων 23, 157 71')
  })
})
