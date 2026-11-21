import { describe, it, expect, vi, beforeEach } from 'vitest'
import boxnowCarrier from '~~/shared/shipping/providers/boxnow'
import { makeBoxNowPickedLocker } from '~~/test/fixtures/boxnow'

/**
 * The BOX NOW adapter turns the rows of `/api/shipping/lockers/boxnow`
 * (Django's synced catalogue, normalised by that route) into the
 * carrier-neutral `Locker` the generic picker renders, and writes the
 * chosen one back onto the checkout form: `boxnowLockerId` is what the
 * order sends, `boxnowLocker` what the cards show.
 *
 * `$fetch` is a global in the code this runs in, so the spec swaps the
 * global for a spy.
 */
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

/** A row of the route, for the default `makeBoxNowLocker()`. */
const row = (overrides: Record<string, unknown> = {}) => ({
  externalId: '4',
  name: 'Χαλάνδρι ΟΠΑΠ Play',
  addressLine1: 'Λεωφ. Πεντέλης 125',
  addressLine2: '',
  postalCode: '15234',
  countryCode: 'GR',
  lat: 38.02,
  lng: 23.8,
  note: '',
  ...overrides,
})

describe('the BOX NOW adapter', () => {
  it('names its code and the form field its locker lands in', () => {
    expect(boxnowCarrier.code).toBe('boxnow')
    expect(boxnowCarrier.formFieldName).toBe('boxnowLockerId')
  })

  describe('fetchAll', () => {
    it('reads the country\'s catalogue from its own route', async () => {
      fetchMock.mockResolvedValue([])
      const signal = new AbortController().signal

      await boxnowCarrier.fetchAll('CY', signal)

      expect(fetchMock).toHaveBeenCalledWith('/api/shipping/lockers/boxnow', {
        method: 'GET',
        query: { country: 'CY' },
        signal,
      })
    })

    it('normalises each row into a locker', async () => {
      const locker = row({ addressLine2: 'Είσοδος από την Αγίου Γεωργίου', note: 'Δίπλα στο περίπτερο' })
      fetchMock.mockResolvedValue([locker])

      expect(await boxnowCarrier.fetchAll('GR')).toEqual([{
        key: '4',
        id: '4',
        name: 'Χαλάνδρι ΟΠΑΠ Play',
        addressLine1: 'Λεωφ. Πεντέλης 125',
        addressLine2: 'Είσοδος από την Αγίου Γεωργίου',
        city: '',
        postalCode: '15234',
        countryCode: 'GR',
        lat: 38.02,
        lng: 23.8,
        workingHours: 'Δίπλα στο περίπτερο',
        raw: locker,
      }])
    })

    it('names a locker by its id without a name, and drops one with no id', async () => {
      fetchMock.mockResolvedValue([row({ name: '', countryCode: '' }), row({ externalId: '  ' })])

      expect(await boxnowCarrier.fetchAll('GR')).toEqual([
        expect.objectContaining({ id: '4', name: '4', countryCode: 'GR', addressLine2: null, workingHours: null }),
      ])
    })
  })

  it('writes the picked locker to the form, and reads it back', async () => {
    fetchMock.mockResolvedValue([row()])
    const [locker] = await boxnowCarrier.fetchAll('GR')
    const form: Record<string, unknown> = {}

    boxnowCarrier.applyToFormState(form, locker!)

    expect(form).toEqual({ boxnowLockerId: '4', boxnowLocker: makeBoxNowPickedLocker() })
    expect(boxnowCarrier.readLockerId(form)).toBe('4')
    expect(boxnowCarrier.readSelectedLocker(form)).toMatchObject({
      key: locker!.key,
      id: '4',
      name: 'Χαλάνδρι ΟΠΑΠ Play',
      addressLine1: 'Λεωφ. Πεντέλης 125',
      postalCode: '15234',
      countryCode: 'GR',
    })
  })

  it.each([
    ['a stored locker without an id', { boxnowLocker: makeBoxNowPickedLocker({ externalId: '' }) }],
    ['nothing stored', {}],
  ])('has no selection for %s', (_case, form) => {
    expect(boxnowCarrier.readSelectedLocker(form)).toBeNull()
  })

  it.each([[''], [undefined], [4]])('has no locker id for %j', (id) => {
    expect(boxnowCarrier.readLockerId({ boxnowLockerId: id })).toBeNull()
  })

  it.each([
    ['the locker', { boxnowLockerId: '4' }, { boxnowLockerId: '4' }],
    ['nothing without a locker', { boxnowLockerId: '' }, {}],
  ])('sends %s with the order', (_case, form, payload) => {
    expect(boxnowCarrier.buildOrderPayload!(form)).toEqual(payload)
  })
})
