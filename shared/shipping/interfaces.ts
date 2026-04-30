/**
 * Symmetric carrier abstraction — mirror of the Python
 * ``shipping/interfaces.py::ShippingCarrierInterface`` registry.
 *
 * Goals:
 * 1. **Scalability** — adding a new courier (ELTA, Speedex, Geniki…)
 *    means dropping one ``shared/shipping/providers/<code>.ts`` file.
 *    No edits to {@link StepShipping}, {@link useCheckoutForm}, or
 *    server proxies.
 * 2. **Symmetry** — the ``code`` value here matches
 *    ``ShippingProvider.code`` on the backend and the same string is
 *    what each adapter's ``register_provider`` decorator stamps on
 *    the Python side. The frontend's ``listCarriers().map(c=>c.code)``
 *    must equal the Python registry's keys.
 * 3. **No hardcoded provider checks** anywhere outside this module —
 *    the dispatch table is the registry; consumers ask
 *    {@link getCarrier} or iterate {@link listCarriers}.
 *
 * The runtime implementation lives in ``./registry.ts``; the
 * concrete adapters in ``./providers/``.
 */

/** A locker / pickup point — normalised across carriers. */
export interface Locker {
  /** Stable provider-side identifier — what we send back when the
   *  shopper picks this row. ACS: ``external_id``. BoxNow: ``id``. */
  id: string
  /** Optional internal branch / station code (ACS only). */
  branchCode?: string | null
  /** Display name. Brand-prefixed by the provider when needed. */
  name: string
  /** Street address line 1 — usually street + number. */
  addressLine1: string
  /** Optional second address line — floor, building, etc. */
  addressLine2?: string | null
  /** City / municipality — used for the city-fallback search path. */
  city: string
  /** 5-digit postal code (Greek/Cypriot). */
  postalCode: string
  /** ISO-2 country code. */
  countryCode: string
  /** Latitude — already coerced to ``number`` by the adapter
   *  (Django serialises Decimal as string). May be ``null`` when
   *  the provider doesn't have coordinates for this row. */
  lat: number | null
  /** Longitude — same coercion + null caveat as ``lat``. */
  lng: number | null
  /** Free-text working hours (provider-specific format). */
  workingHours?: string | null
  /** Optional max parcel weight enforced at the provider's locker
   *  (kg). Used by the picker to filter when the cart exceeds it. */
  maxWeightKg?: number | null
  /** Original provider response — kept on the locker so consumers
   *  that need provider-specific fields don't need a second fetch. */
  raw: unknown
}

/** Query parameters accepted by {@link ShippingCarrier.fetchByPostal}. */
export interface LockerQuery {
  /** 5-digit Greek postal code. */
  postalCode: string
  /** Optional city fallback when the postal-code prefix returns 0. */
  city?: string
  /** ISO-2 country code; defaults to the carrier's primary country. */
  country?: string
  /** Optional shop_kind override (rarely used; carrier picks the
   *  right default by reading provider metadata server-side). */
  shopKind?: number
  /** AbortSignal for in-flight cancellation when the user types
   *  a fresh postcode while a previous fetch is pending. */
  signal?: AbortSignal
}

/** Provider metadata mirror — typed shape of
 *  ``ShippingProvider.metadata`` as exposed by
 *  ``GET /api/v1/shipping/options``. ALL fields optional because
 *  any subset can be missing on a fresh seed; consumers fall back
 *  to component-level defaults. */
export interface CarrierProviderMetadata {
  supportedCountries?: string[]
  lockerPickerKind?: 'boxnow_widget' | 'acs_db_picker' | string
  taglineKey?: string
  taglineColor?: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'neutral'
  logo?: string
  /** Phase-0 keys (``ShippingProvider.metadata`` on the backend). */
  shopKindsByCountry?: Record<string, number[]>
  nearestLimit?: number
  minWeightKg?: string | number
  maxWeightKg?: string | number
  defaultMapCenter?: [number, number]
  defaultMapZoom?: number
  tileProvider?: {
    light?: TileLayerSpec
    dark?: TileLayerSpec
  }
  usesGenericPicker?: boolean
}

/** A Leaflet TileLayer constructor args, exposed verbatim from
 *  the backend so swapping CARTO ↔ Stadia ↔ MapTiler is one DB
 *  row update. */
export interface TileLayerSpec {
  url: string
  attribution: string
  maxZoom?: number
  subdomains?: string
}

/** Strategy contract — every carrier (ACS, BoxNow, future ELTA…)
 *  ships an instance of this. Unimplemented hooks are optional;
 *  the registry never crashes for a missing capability. */
export interface ShippingCarrier {
  /** ``ShippingProvider.code`` — must match the Python registry. */
  readonly code: string

  /** Human-readable label for logs / error messages.
   *  User-facing labels live in i18n keys, not here. */
  readonly label: string

  /**
   * ``true`` → the {@link GenericLockerPicker} renders for this
   *   carrier. Required when the carrier exposes a server-side
   *   locker catalogue (ACS).
   * ``false`` → the carrier brings its own picker (BoxNow's iframe
   *   widget). The generic UI sits this one out.
   */
  readonly usesGenericPicker: boolean

  /** Search by postal code (debounced from the picker). Required
   *  when ``usesGenericPicker`` is true. */
  fetchByPostal?(query: LockerQuery): Promise<Locker[]>

  /** Bulk fetch — backs the map view. Returns every active locker
   *  for the country in one call. Optional; carriers that don't
   *  expose this should fall back to ``fetchByPostal``-only UI. */
  fetchAll?(country: string, signal?: AbortSignal): Promise<Locker[]>

  /** Commit a picked locker to the checkout form state. The
   *  carrier writes its own provider-specific keys (BoxNow's
   *  ``boxnowLockerId`` vs ACS's ``acsStationExternalId``). The
   *  caller doesn't know or care. */
  applyToFormState(formState: Record<string, any>, locker: Locker): void

  /** Pull the currently-selected locker ID from the form state.
   *  Used by the Zod superRefine to drive validation per-carrier
   *  without an if-tower. */
  readLockerId(formState: Record<string, any>): string | null

  /** Detail view used by the selected-locker card. The carrier
   *  knows where it stashed the previous selection. */
  readSelectedLocker(formState: Record<string, any>): Locker | null

  /** When ``usesGenericPicker`` is false, the carrier provides its
   *  own picker component. Resolved at component-render time so
   *  the bundle is split correctly. */
  pickerComponentName?: string
}
