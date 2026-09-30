import { describe, it, expect, vi, beforeEach } from 'vitest'
import acsCarrier, { acsLockerKey } from '~~/shared/shipping/providers/acs'
import type { Locker } from '~~/shared/shipping/interfaces'

/**
 * The ACS adapter turns Django's `AcsStation` rows into the carrier-
 * neutral `Locker` the generic picker renders, and writes the chosen
 * one back onto the checkout form under the keys the order-create
 * payload sends. Those keys are a contract with persisted drafts and
 * the API, so they are asserted by name.
 *
 * `$fetch` is a global in the code this runs in (app and Nitro alike),
 * so the spec swaps the global for a spy.
 */
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('$fetch', fetchMock)
})

const station = (overrides: Record<string, unknown> = {}) => ({
  externalId: 'ATH',
  branchCode: 'BR1',
  name: 'Smartpoint Γλυφάδα',
  addressLine1: 'Λεωφ. Βουλιαγμένης 42',
  city: 'Γλυφάδα',
  postalCode: '16674',
  countryCode: 'gr',
  lat: '37.8600',
  lng: '23.7500',
  workingHours: '24/7',
  maxWeightKg: '20.00',
  ...overrides,
})

const LOCKER: Locker = {
  key: acsLockerKey('ATH', 'BR1'),
  id: 'ATH',
  branchCode: 'BR1',
  name: 'Smartpoint Γλυφάδα',
  addressLine1: 'Λεωφ. Βουλιαγμένης 42',
  addressLine2: null,
  city: 'Γλυφάδα',
  postalCode: '16674',
  countryCode: 'GR',
  lat: 37.86,
  lng: 23.75,
  workingHours: '24/7',
  maxWeightKg: 20,
  raw: {},
}

describe('the ACS adapter', () => {
  // Django keys a station on (external_id, branch_code): every Smartpoint
  // in an area shares its external id. Keyed on the id alone, the map
  // found the FIRST locker of the area for any pick in it, and the order
  // went to that locker.
  it('tells apart two lockers of one area, and writes the picked pair to the form', async () => {
    fetchMock.mockResolvedValue([station({ branchCode: '001' }), station({ branchCode: '002', name: 'Smartpoint Γλυφάδα 2' })])

    const [first, second] = await acsCarrier.fetchByPostal!({ postalCode: '16674' })

    expect(first!.id).toBe(second!.id)
    expect(first!.key).not.toBe(second!.key)
    const form: Record<string, unknown> = {}
    acsCarrier.applyToFormState(form, second!)
    expect(form).toMatchObject({ acsStationExternalId: 'ATH', acsStationBranch: '002' })
    expect(acsCarrier.readSelectedLocker!(form)!.key).toBe(second!.key)
  })

  it('keys an ACS locker unambiguously, whatever its codes contain', () => {
    expect(acsLockerKey('A:B', 'C')).not.toBe(acsLockerKey('A', 'B:C'))
  })

  it('uses the generic locker picker', () => {
    expect(acsCarrier.code).toBe('acs')
    expect(acsCarrier.usesGenericPicker).toBe(true)
    expect(acsCarrier.formFieldName).toBe('acsStationExternalId')
  })

  describe('fetchByPostal', () => {
    it('asks for the nearest stations with every filter it was given', async () => {
      fetchMock.mockResolvedValue([])
      const signal = new AbortController().signal

      await acsCarrier.fetchByPostal!({ postalCode: '16674', city: 'Γλυφάδα', country: 'GR', shopKind: 7, signal })

      expect(fetchMock).toHaveBeenCalledWith('/api/shipping/acs/nearest', {
        method: 'GET',
        query: { postalCode: '16674', city: 'Γλυφάδα', countryCode: 'GR', shopKind: '7' },
        signal,
      })
    })

    it('sends only the postal code when that is all it has', async () => {
      fetchMock.mockResolvedValue([])

      await acsCarrier.fetchByPostal!({ postalCode: '16674' })

      expect(fetchMock.mock.calls[0]![1].query).toEqual({ postalCode: '16674' })
    })

    it('normalises each station into a locker', async () => {
      const row = station()
      fetchMock.mockResolvedValue([row])

      expect(await acsCarrier.fetchByPostal!({ postalCode: '16674' })).toEqual([{ ...LOCKER, raw: row }])
    })

    it('fills what a station leaves out, and drops one with no id', async () => {
      const bare = station({
        externalId: '  ATH2 ',
        branchCode: '',
        name: '',
        countryCode: '',
        lat: '',
        lng: null,
        workingHours: '',
        maxWeightKg: 'n/a',
      })
      fetchMock.mockResolvedValue([station({ externalId: '   ' }), bare])

      expect(await acsCarrier.fetchByPostal!({ postalCode: '16674' })).toEqual([{
        ...LOCKER,
        key: acsLockerKey('ATH2', null),
        id: 'ATH2',
        branchCode: null,
        name: 'ATH2',
        lat: null,
        lng: null,
        workingHours: null,
        maxWeightKg: null,
        raw: bare,
      }])
    })

    it('treats an empty answer as no stations', async () => {
      fetchMock.mockResolvedValue(null)

      expect(await acsCarrier.fetchByPostal!({ postalCode: '16674' })).toEqual([])
    })
  })

  it('fetches a country\'s whole catalogue through the carrier-keyed route', async () => {
    fetchMock.mockResolvedValue([station()])
    const signal = new AbortController().signal

    const lockers = await acsCarrier.fetchAll!('CY', signal)

    expect(fetchMock).toHaveBeenCalledWith('/api/shipping/lockers/acs', { method: 'GET', query: { country: 'CY' }, signal })
    expect(lockers.map(l => l.id)).toEqual(['ATH'])
  })

  describe('on the checkout form', () => {
    it('writes the station under the keys the order payload sends', () => {
      const form: Record<string, unknown> = {}

      acsCarrier.applyToFormState(form, LOCKER)

      expect(form).toEqual({
        acsStationExternalId: 'ATH',
        acsStationBranch: 'BR1',
        acsStation: {
          externalId: 'ATH',
          branchCode: 'BR1',
          name: 'Smartpoint Γλυφάδα',
          addressLine1: 'Λεωφ. Βουλιαγμένης 42',
          addressLine2: null,
          city: 'Γλυφάδα',
          postalCode: '16674',
          countryCode: 'GR',
          workingHours: '24/7',
        },
      })
      expect(acsCarrier.readLockerId(form)).toBe('ATH')
    })

    it('reads the selected station back as a locker', () => {
      const form: Record<string, unknown> = {}
      acsCarrier.applyToFormState(form, LOCKER)

      expect(acsCarrier.readSelectedLocker!(form)).toEqual({
        ...LOCKER,
        lat: null,
        lng: null,
        maxWeightKg: null,
        raw: form.acsStation,
      })
    })

    it('fills a stored station\'s missing fields rather than failing', () => {
      const stored = { externalId: 'ATH' }

      expect(acsCarrier.readSelectedLocker!({ acsStation: stored })).toEqual({
        key: acsLockerKey('ATH', null),
        id: 'ATH',
        branchCode: null,
        name: 'ATH',
        addressLine1: '',
        addressLine2: null,
        city: '',
        postalCode: '',
        countryCode: 'GR',
        lat: null,
        lng: null,
        workingHours: null,
        maxWeightKg: null,
        raw: stored,
      })
    })

    it.each([
      ['nothing stored', {}],
      ['a stored station without an id', { acsStation: { externalId: '' } }],
      ['a stored value that is not a station', { acsStation: 'ATH' }],
    ])('has no selection for %s', (_case, form) => {
      expect(acsCarrier.readSelectedLocker!(form)).toBeNull()
    })

    it.each([[''], [undefined], [42]])('has no locker id for %j', (id) => {
      expect(acsCarrier.readLockerId({ acsStationExternalId: id })).toBeNull()
    })

    it('sends the station and its branch with the order', () => {
      expect(acsCarrier.buildOrderPayload!({ acsStationExternalId: 'ATH', acsStationBranch: 'BR1' }))
        .toEqual({ acsStationExternalId: 'ATH', acsStationBranch: 'BR1' })
      // An empty branch is still sent: it is a real ACS value.
      expect(acsCarrier.buildOrderPayload!({ acsStationExternalId: 'ATH', acsStationBranch: '' }))
        .toEqual({ acsStationExternalId: 'ATH', acsStationBranch: '' })
      expect(acsCarrier.buildOrderPayload!({ acsStationExternalId: '' })).toEqual({})
    })
  })
})
