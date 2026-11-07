import { describe, expect, it } from 'vitest'
import type { Locker } from '~~/shared/shipping/interfaces'
import { acsLockerKey } from '~~/shared/shipping/providers/acs'
import {
  distanceKm,
  foldSearchText,
  lockerSearchWords,
  matchesQuery,
  postcodeCentre,
  searchQueryWords,
} from '~/utils/lockerSearch'

/**
 * Finding a locker the way a Greek shopper types: any case, with or
 * without accents, in Greek or in Greeklish, half a word at a time.
 */

function locker(overrides: Partial<Locker> = {}): Locker {
  return {
    key: acsLockerKey('GGL', '514'),
    id: 'GGL',
    branchCode: '514',
    name: 'ACS SMARTPOINT LOCKER ΑΘΗΝΑ',
    addressLine1: 'Laundromat, Ιουλιανού 50',
    addressLine2: null,
    city: 'Αθήνα',
    postalCode: '10433',
    countryCode: 'GR',
    lat: 37.9919168,
    lng: 23.7276555,
    workingHours: '24ΩΡΟ',
    maxWeightKg: 6,
    raw: {},
    ...overrides,
  }
}

const finds = (query: string, target: Locker = locker()) =>
  matchesQuery(lockerSearchWords(target), searchQueryWords(query))

describe('foldSearchText', () => {
  it.each([
    ['Θεσσαλονίκη', 'ΘΕΣΣΑΛΟΝΙΚΗ'],
    ['Θεσσαλονίκη', 'thessaloniki'],
    ['Χαλάνδρι', 'chalandri'],
    ['Χαλάνδρι', 'xalandri'],
    ['Μπουρνάζι', 'bournazi'],
    ['Μπουρνάζι', 'mpournazi'],
    ['Ξάνθη', 'ksanthi'],
    ['Ξάνθη', 'xanthi'],
    ['Κυψέλη', 'kipseli'],
    ['Κυψέλη', 'kypseli'],
    ['Πειραιάς', 'ΠΕΙΡΑΙΑΣ'],
    ['Πειραιάς', 'peiraias'],
    ['Πειραιάς', 'pireas'],
    ['Θεσσαλονίκη', 'thesaloniki'],
    ['Κηφισιά', 'kifissia'],
    ['Κοιλάδα', 'kilada'],
    ['Πατήσια', 'πατησια'],
  ])('folds %s and %s to one form', (a, b) => {
    expect(foldSearchText(a)).toBe(foldSearchText(b))
  })

  it('keeps different places apart', () => {
    expect(foldSearchText('Αθήνα')).not.toBe(foldSearchText('Αθηνών'))
  })

  it('keeps a postcode\'s doubled digits', () => {
    expect(foldSearchText('10557')).toBe('10557')
  })
})

describe('matching a locker', () => {
  it.each([
    'αθηνα',
    'ΑΘΗΝΑ',
    'Αθήνα',
    'athina',
    'αθ',
    'ιουλιανου',
    'ioulianou 50',
    'laundromat',
    '10433',
    '104',
    'smartpoint αθηνα',
    'αθηνα 10433',
  ])('finds it by %j', (query) => {
    expect(finds(query)).toBe(true)
  })

  it.each([
    'πειραιας',
    '105',
    'αθηνα 10533',
    'θηνα',
  ])('does not find it by %j', (query) => {
    expect(finds(query)).toBe(false)
  })

  it('reads a postcode typed with its space as one postcode', () => {
    expect(searchQueryWords('104 33')).toEqual(['10433'])
    expect(finds('104 33')).toBe(true)
  })

  it('has no words for a blank query', () => {
    expect(searchQueryWords('  ,  ')).toEqual([])
  })
})

describe('distanceKm', () => {
  it('measures the great-circle distance', () => {
    const syntagma = { lat: 37.9755, lng: 23.7348 }
    const thessaloniki = { lat: 40.6401, lng: 22.9444 }

    expect(distanceKm(syntagma, thessaloniki)).toBeCloseTo(304, 0)
    expect(distanceKm(syntagma, syntagma)).toBe(0)
  })
})

describe('postcodeCentre', () => {
  const a = locker({ postalCode: '10433', lat: 38, lng: 23.7 })
  const b = locker({ postalCode: '10433', lat: 38.2, lng: 23.9 })
  const c = locker({ postalCode: '10434', lat: 37, lng: 22 })

  it('is the middle of the lockers at that postcode', () => {
    const centre = postcodeCentre([a, b, c], '10433')!

    expect(centre.lat).toBeCloseTo(38.1, 6)
    expect(centre.lng).toBeCloseTo(23.8, 6)
  })

  it('falls back to the postcode\'s area when it has no locker', () => {
    const centre = postcodeCentre([a, b, c], '104 99')!

    expect(centre.lat).toBeCloseTo(37.733, 3)
    expect(centre.lng).toBeCloseTo(23.2, 3)
  })

  it('is unknown for a postcode with nothing near, or too short to place', () => {
    expect(postcodeCentre([a, b, c], '54622')).toBeNull()
    expect(postcodeCentre([a, b, c], '10')).toBeNull()
    expect(postcodeCentre([locker({ lat: null, lng: null })], '10433')).toBeNull()
  })
})
