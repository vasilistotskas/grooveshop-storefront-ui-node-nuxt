import { describe, it, expect } from 'vitest'
import boxnowCarrier from '~~/shared/shipping/providers/boxnow'
import type { Locker } from '~~/shared/shipping/interfaces'

/**
 * BoxNow has no locker catalogue to query: its own iframe widget does
 * the picking and posts the choice back. So the adapter opts out of the
 * generic picker, names the component that mounts the widget, and owns
 * the form keys that choice lands in — which the order-create payload
 * sends verbatim.
 */
const LOCKER: Locker = {
  key: '4',
  id: '4',
  name: 'Χαλάνδρι Locker',
  addressLine1: 'Λεωφ. Πεντέλης 125',
  addressLine2: null,
  city: '',
  postalCode: '15234',
  countryCode: 'GR',
  lat: null,
  lng: null,
  workingHours: 'Δίπλα στο περίπτερο',
  raw: {},
}

describe('the BoxNow adapter', () => {
  it('hands the picking to its own widget', () => {
    expect(boxnowCarrier.code).toBe('boxnow')
    expect(boxnowCarrier.usesGenericPicker).toBe(false)
    expect(boxnowCarrier.pickerComponentName).toBe('CheckoutSelectedBoxNowLocker')
    expect(boxnowCarrier.formFieldName).toBe('boxnowLockerId')
  })

  it('writes the locker in the widget\'s own shape', () => {
    const form: Record<string, unknown> = {}

    boxnowCarrier.applyToFormState(form, LOCKER)

    expect(form).toEqual({
      boxnowLockerId: '4',
      boxnowLocker: {
        boxnowLockerId: '4',
        boxnowLockerName: 'Χαλάνδρι Locker',
        boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
        boxnowLockerAddressLine2: '',
        boxnowLockerPostalCode: '15234',
        boxnowLockerNote: 'Δίπλα στο περίπτερο',
        boxnowLockerCountryCode: 'GR',
      },
    })
    expect(boxnowCarrier.readLockerId(form)).toBe('4')
  })

  it('reads the chosen locker back, with the country of the widget map it came from', () => {
    const stored = {
      boxnowLockerId: '9',
      boxnowLockerName: 'Λευκωσία Locker',
      boxnowLockerAddressLine1: 'Λεωφόρος Μακαρίου 1',
      boxnowLockerPostalCode: '1010',
      boxnowLockerCountryCode: 'CY',
    }

    // The delivery country is GR; the CY locker's own country must win.
    expect(boxnowCarrier.readSelectedLocker!({ country: 'GR', boxnowLockerId: '9', boxnowLocker: stored })).toEqual({
      key: '9',
      id: '9',
      name: 'Λευκωσία Locker',
      addressLine1: 'Λεωφόρος Μακαρίου 1',
      addressLine2: null,
      city: '',
      postalCode: '1010',
      countryCode: 'CY',
      lat: null,
      lng: null,
      workingHours: null,
      raw: stored,
    })
  })

  it.each([
    // The picker only accepts a locker whose map matches the delivery
    // country; without the map's country the selection cannot be checked.
    ['a stored locker whose map country is unknown', { boxnowLocker: { boxnowLockerId: '4', boxnowLockerName: 'Χαλάνδρι Locker' } }],
    ['a stored locker without an id', { boxnowLocker: { boxnowLockerId: '', boxnowLockerCountryCode: 'GR' } }],
    ['nothing stored', {}],
  ])('has no selection for %s', (_case, form) => {
    expect(boxnowCarrier.readSelectedLocker!(form)).toBeNull()
  })

  it('names the locker by its id when the widget gave no name', () => {
    const locker = boxnowCarrier.readSelectedLocker!({ boxnowLocker: { boxnowLockerId: '4', boxnowLockerCountryCode: 'GR' } })

    expect(locker).toMatchObject({ id: '4', name: '4', addressLine1: '', postalCode: '' })
  })

  it.each([[''], [undefined], [4]])('has no locker id for %j', (id) => {
    expect(boxnowCarrier.readLockerId({ boxnowLockerId: id })).toBeNull()
  })

  it.each([
    ['the locker and a valid compartment size', { boxnowLockerId: '4', boxnowCompartmentSize: 2 }, { boxnowLockerId: '4', boxnowCompartmentSize: 2 }],
    ['the locker alone for a size BoxNow does not have', { boxnowLockerId: '4', boxnowCompartmentSize: 4 }, { boxnowLockerId: '4' }],
    ['nothing without a locker', { boxnowLockerId: '', boxnowCompartmentSize: '2' }, {}],
  ])('sends %s with the order', (_case, form, payload) => {
    expect(boxnowCarrier.buildOrderPayload!(form)).toEqual(payload)
  })
})
