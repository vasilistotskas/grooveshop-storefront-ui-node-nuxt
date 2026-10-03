import { describe, it, expect } from 'vitest'
import { reviewerName } from '~/utils/reviewer'

describe('reviewerName', () => {
  it.each([
    { firstName: 'Γιώργος', lastName: 'Παπαδόπουλος', name: 'Γιώργος Π.' },
    { firstName: '  Eleni ', lastName: ' Tsou ', name: 'Eleni T.' },
    { firstName: 'Kostas', lastName: '', name: 'Kostas' },
    { firstName: '', lastName: 'Mavros', name: 'Mavros' },
    { firstName: '', lastName: '', name: null },
  ])('names $firstName $lastName as $name', ({ firstName, lastName, name }) => {
    expect(reviewerName({ firstName, lastName })).toBe(name)
  })

  it('has no name for a missing reviewer', () => {
    expect(reviewerName(null)).toBeNull()
  })
})
