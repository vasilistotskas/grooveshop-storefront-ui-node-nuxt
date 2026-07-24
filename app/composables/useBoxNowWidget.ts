/**
 * BoxNow locker-picker widget utilities.
 *
 * All exports are pure functions (no useFetch, no useState, no DOM access).
 * They are unit-testable in a plain Node environment.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoxNowSelectedLocker {
  /** BoxNow APM identifier, e.g. "4" */
  boxnowLockerId: string
  boxnowLockerPostalCode: string
  boxnowLockerAddressLine1: string
  boxnowLockerAddressLine2?: string
  boxnowLockerName?: string
  boxnowLockerNote?: string
  boxnowLockerLat?: string
  boxnowLockerLng?: string
  boxnowLockerImage?: string
}

export interface BoxNowWidgetUrlOptions {
  /** BoxNow partner ID (required). */
  partnerId: string | number
  /**
   * Widget display mode.
   * @default 'iframe'
   */
  type?: 'iframe' | 'popup' | 'navigate' | 'navigateen'
  /**
   * Widget UI language (ISO 639-1 code).
   * @default 'el'
   */
  language?: string
  /** Pre-select a locker by its external ID. */
  lockerId?: string
  /** Pre-filter lockers by postal code. */
  zip?: string
  /**
   * Request geolocation to centre the map on the user.
   * @default true
   */
  gps?: boolean
  /**
   * Auto-select the nearest locker if only one is visible.
   * @default true
   */
  autoselect?: boolean
  /**
   * Close the widget iframe automatically after selection.
   * @default false
   */
  autoclose?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Explicit allowlist of origins from which BoxNow widget postMessage
 * events are accepted. **Must stay in sync with the CSP ``frame-src``**
 * directive at ``server/middleware/3.csp.ts``. An origin in this list
 * but missing from ``frame-src`` cannot legitimately host an iframe
 * on our page, so accepting its postMessage events is dead weight that
 * widens the attack surface for nothing.
 *
 * Active origins:
 * - ``widget-v5.boxnow.<tld>`` — the version ``buildBoxNowIframeUrl``
 *   actually loads (gr/cy/bg/hr).
 * - ``widget-v4.boxnow.gr`` — BoxNow's CDN currently HTTP-redirects the
 *   v5 iframe URL here, so the frame the user interacts with (and that
 *   posts the locker-selected message) has this origin.
 * - ``widget.boxnow.gr`` — unversioned alias kept for back-compat.
 */
export const BOXNOW_ALLOWED_ORIGINS: readonly string[] = [
  'https://widget-v5.boxnow.gr',
  'https://widget-v5.boxnow.cy',
  'https://widget-v5.boxnow.bg',
  'https://widget-v5.boxnow.hr',
  'https://widget-v4.boxnow.gr',
  'https://widget.boxnow.gr',
] as const

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Build the BoxNow widget iframe URL from the given options.
 *
 * @throws {Error} When `partnerId` is missing or empty.
 */
export function buildBoxNowIframeUrl(options: BoxNowWidgetUrlOptions): string {
  const {
    partnerId,
    type = 'iframe',
    language = 'el',
    lockerId,
    zip,
    gps = true,
    autoselect = true,
    autoclose = false,
  } = options

  if (partnerId === '' || partnerId === null || partnerId === undefined) {
    throw new Error('partnerId is required')
  }

  const params = new URLSearchParams()
  params.set('partnerId', String(partnerId))
  params.set('type', type)
  params.set('language', language)
  params.set('gps', gps ? 'yes' : 'no')
  params.set('autoselect', autoselect ? 'yes' : 'no')
  params.set('autoclose', autoclose ? 'yes' : 'no')

  if (lockerId !== undefined && lockerId !== '') {
    params.set('lockerId', lockerId)
  }
  if (zip !== undefined && zip !== '') {
    params.set('zip', zip)
  }

  return `https://widget-v5.boxnow.gr/iframe.html?${params.toString()}`
}

/**
 * Returns ``true`` if the given message origin should be trusted for
 * BoxNow postMessage events. Strictly bounded to {@link BOXNOW_ALLOWED_ORIGINS}
 * — the previous regex fallback (``map``/``widget-new`` subdomains) was
 * dropped because the CSP ``frame-src`` doesn't list those origins, so
 * they can't host an iframe on our page anyway. Trusting their messages
 * was open surface for nothing.
 */
export function isBoxNowAllowedOrigin(origin: string): boolean {
  return (BOXNOW_ALLOWED_ORIGINS as readonly string[]).includes(origin)
}

/**
 * Type-safe parser for the `event.data` payload emitted by the BoxNow widget
 * iframe via `window.postMessage`.
 *
 * Returns a normalised {@link BoxNowSelectedLocker} when the payload contains
 * the three required fields (`boxnowLockerId`, `boxnowLockerPostalCode`,
 * `boxnowLockerAddressLine1`), otherwise returns `null`.
 *
 * Intentionally avoids Zod to keep this utility dependency-free.
 */
export function parseBoxNowSelectedLocker(data: unknown): BoxNowSelectedLocker | null {
  if (data === null || typeof data !== 'object') {
    return null
  }

  const d = data as Record<string, unknown>

  // Required fields — all must be non-empty strings.
  if (
    typeof d.boxnowLockerId !== 'string' || d.boxnowLockerId === ''
    || typeof d.boxnowLockerPostalCode !== 'string' || d.boxnowLockerPostalCode === ''
    || typeof d.boxnowLockerAddressLine1 !== 'string' || d.boxnowLockerAddressLine1 === ''
  ) {
    return null
  }

  const locker: BoxNowSelectedLocker = {
    boxnowLockerId: d.boxnowLockerId,
    boxnowLockerPostalCode: d.boxnowLockerPostalCode,
    boxnowLockerAddressLine1: d.boxnowLockerAddressLine1,
  }

  // Optional fields — include only when they are non-empty strings.
  if (typeof d.boxnowLockerAddressLine2 === 'string' && d.boxnowLockerAddressLine2 !== '') {
    locker.boxnowLockerAddressLine2 = d.boxnowLockerAddressLine2
  }
  if (typeof d.boxnowLockerName === 'string' && d.boxnowLockerName !== '') {
    locker.boxnowLockerName = d.boxnowLockerName
  }
  if (typeof d.boxnowLockerNote === 'string' && d.boxnowLockerNote !== '') {
    locker.boxnowLockerNote = d.boxnowLockerNote
  }
  if (typeof d.boxnowLockerLat === 'string' && d.boxnowLockerLat !== '') {
    locker.boxnowLockerLat = d.boxnowLockerLat
  }
  if (typeof d.boxnowLockerLng === 'string' && d.boxnowLockerLng !== '') {
    locker.boxnowLockerLng = d.boxnowLockerLng
  }
  if (typeof d.boxnowLockerImage === 'string' && d.boxnowLockerImage !== '') {
    locker.boxnowLockerImage = d.boxnowLockerImage
  }

  return locker
}
