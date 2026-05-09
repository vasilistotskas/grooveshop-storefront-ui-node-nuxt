/**
 * Phase-1 regression guard: the carrier registry must self-populate
 * from ``shared/shipping/providers/*.ts`` and the ``acs`` /
 * ``boxnow`` adapters must surface the right ``usesGenericPicker``
 * verdict. If this fails, you've either broken
 * ``import.meta.glob('./providers/*.ts')`` or removed an adapter
 * file by accident.
 */
import { afterEach, describe, expect, it } from 'vitest'

import {
  __registerForTest,
  __resetForTest,
  getCarrier,
  isCarrierCode,
  listCarriers,
} from '../../../shared/shipping/registry'
import type { ShippingCarrier } from '../../../shared/shipping/interfaces'
import {
  carrierForMethod,
  methodForCarrier,
} from '../../../shared/shipping/index'

afterEach(() => __resetForTest())

describe('shipping/registry', () => {
  it('auto-discovers ACS and BoxNow adapters', () => {
    const codes = listCarriers().map((c) => c.code).sort()
    expect(codes).toEqual(['acs', 'boxnow'])
  })

  it('returns null for unknown codes', () => {
    expect(getCarrier('elta')).toBeNull()
    expect(getCarrier('')).toBeNull()
    expect(getCarrier(null)).toBeNull()
  })

  it('isCarrierCode tracks registered codes', () => {
    expect(isCarrierCode('acs')).toBe(true)
    expect(isCarrierCode('boxnow')).toBe(true)
    expect(isCarrierCode('elta')).toBe(false)
    expect(isCarrierCode(42)).toBe(false)
  })

  it('test override wins over the file-based adapter', () => {
    const stub: ShippingCarrier = {
      code: 'acs',
      label: 'ACS Stub',
      usesGenericPicker: false,
      applyToFormState: () => {},
      readLockerId: () => null,
      readSelectedLocker: () => null,
    }
    __registerForTest(stub)
    expect(getCarrier('acs')?.label).toBe('ACS Stub')
  })

  it('reset clears overrides without losing real adapters', () => {
    const stub: ShippingCarrier = {
      code: 'acs',
      label: 'Stub',
      usesGenericPicker: false,
      applyToFormState: () => {},
      readLockerId: () => null,
      readSelectedLocker: () => null,
    }
    __registerForTest(stub)
    __resetForTest()
    const acs = getCarrier('acs')
    expect(acs?.label).toBe('ACS Courier')
  })
})

describe('ACS adapter contract', () => {
  it('declares usesGenericPicker:true', () => {
    expect(getCarrier('acs')?.usesGenericPicker).toBe(true)
  })

  it('writes the ACS-shaped form-state keys', () => {
    const acs = getCarrier('acs')!
    const form: Record<string, any> = {}
    acs.applyToFormState(form, {
      id: 'AAT',
      branchCode: 'BR1',
      name: 'Smartpoint Glyfada',
      addressLine1: 'Λεωφ. Βουλιαγμένης 42',
      city: 'Γλυφάδα',
      postalCode: '16674',
      countryCode: 'GR',
      lat: 37.86,
      lng: 23.75,
      raw: {},
    })
    expect(form.acsStationExternalId).toBe('AAT')
    expect(form.acsStationBranch).toBe('BR1')
    expect(form.acsStation?.externalId).toBe('AAT')
    expect(acs.readLockerId(form)).toBe('AAT')
  })

  it('readSelectedLocker round-trips through the form', () => {
    const acs = getCarrier('acs')!
    const form: Record<string, any> = {
      acsStationExternalId: 'AAT',
      acsStationBranch: 'BR1',
      acsStation: {
        externalId: 'AAT',
        branchCode: 'BR1',
        name: 'Smartpoint Glyfada',
        addressLine1: 'Λεωφ. Βουλιαγμένης 42',
        city: 'Γλυφάδα',
        postalCode: '16674',
        countryCode: 'GR',
        workingHours: '24/7',
      },
    }
    const locker = acs.readSelectedLocker(form)
    expect(locker?.id).toBe('AAT')
    expect(locker?.workingHours).toBe('24/7')
  })
})

describe('BoxNow adapter contract', () => {
  it('declares usesGenericPicker:false (escape hatch for the iframe)', () => {
    expect(getCarrier('boxnow')?.usesGenericPicker).toBe(false)
  })

  it('writes the BoxNow-shaped form-state keys', () => {
    const boxnow = getCarrier('boxnow')!
    const form: Record<string, any> = {}
    boxnow.applyToFormState(form, {
      id: '4',
      name: 'Locker 4',
      addressLine1: 'Athens',
      city: 'Athens',
      postalCode: '11111',
      countryCode: 'GR',
      lat: null,
      lng: null,
      raw: {},
    })
    expect(form.boxnowLockerId).toBe('4')
    expect(form.boxnowLocker?.boxnowLockerId).toBe('4')
    expect(boxnow.readLockerId(form)).toBe('4')
  })
})

describe('carrierForMethod', () => {
  it('maps box_now_locker to boxnow carrier', () => {
    expect(carrierForMethod('box_now_locker')?.code).toBe('boxnow')
  })

  it('maps acs_smartpoint to acs carrier', () => {
    expect(carrierForMethod('acs_smartpoint')?.code).toBe('acs')
  })

  it('returns null for home_delivery and unknown methods', () => {
    expect(carrierForMethod('home_delivery')).toBeNull()
    expect(carrierForMethod('elta_pickup')).toBeNull()
    expect(carrierForMethod(null)).toBeNull()
  })

  it('methodForCarrier reverses the mapping', () => {
    expect(methodForCarrier('boxnow')).toBe('box_now_locker')
    expect(methodForCarrier('acs')).toBe('acs_smartpoint')
    expect(methodForCarrier('elta')).toBeNull()
  })
})
