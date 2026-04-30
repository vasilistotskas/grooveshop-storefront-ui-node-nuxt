/**
 * BoxNow carrier adapter — escape hatch for the iframe widget.
 *
 * BoxNow doesn't expose a queryable locker catalogue we can render
 * ourselves; instead they ship a ``widget-v5.boxnow.gr`` iframe
 * that handles the entire pick UX. So this adapter sets
 * ``usesGenericPicker: false`` and we route to the existing
 * ``CheckoutSelectedBoxNowLocker`` component which mounts the
 * widget. The registry still wins us symmetric dispatch in
 * {@link StepShipping} (no ``if (method === 'box_now_locker')``
 * branch survives) and a single source of truth for the form-state
 * keys this carrier writes.
 *
 * If/when BoxNow exposes a public locker API, flip
 * ``usesGenericPicker`` to ``true`` and wire ``fetchByPostal``;
 * the rest of the abstraction takes care of itself.
 */
import type { Locker, ShippingCarrier } from '../interfaces'

const boxnowCarrier: ShippingCarrier = {
  code: 'boxnow',
  label: 'BOX NOW',
  usesGenericPicker: false,
  pickerComponentName: 'CheckoutSelectedBoxNowLocker',
  formFieldName: 'boxnowLockerId',

  applyToFormState(formState: Record<string, any>, locker: Locker): void {
    // The BoxNow widget already writes the BoxNow-shaped object to
    // formState.boxnowLocker when it resolves; we expose the same
    // hook so test code and future callers can drive selection
    // without touching the widget.
    formState.boxnowLockerId = locker.id
    formState.boxnowLocker = {
      boxnowLockerId: locker.id,
      boxnowLockerName: locker.name,
      boxnowLockerAddressLine1: locker.addressLine1,
      boxnowLockerAddressLine2: locker.addressLine2 ?? '',
      boxnowLockerPostalCode: locker.postalCode,
      boxnowLockerNote: locker.workingHours ?? '',
    }
  },

  readLockerId(formState: Record<string, any>): string | null {
    const id = formState.boxnowLockerId
    return typeof id === 'string' && id.length > 0 ? id : null
  },

  readSelectedLocker(formState: Record<string, any>): Locker | null {
    const stored = formState.boxnowLocker
    if (!stored || typeof stored !== 'object') return null
    const id = stored.boxnowLockerId
    if (typeof id !== 'string' || id.length === 0) return null
    return {
      id,
      name: stored.boxnowLockerName ?? id,
      addressLine1: stored.boxnowLockerAddressLine1 ?? '',
      addressLine2: stored.boxnowLockerAddressLine2 ?? null,
      city: '',
      postalCode: stored.boxnowLockerPostalCode ?? '',
      countryCode: 'GR',
      lat: null,
      lng: null,
      workingHours: stored.boxnowLockerNote ?? null,
      raw: stored,
    }
  },
}

export default boxnowCarrier
