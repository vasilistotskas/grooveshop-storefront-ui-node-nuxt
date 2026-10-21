import type { FormError } from '@nuxt/ui'

/**
 * The address step's fields a picked saved address stands for: its card
 * replaces their inputs (``StepPersonalInfo``'s ``saved`` mode), so an
 * error on one of them has nowhere to show until the fields are opened.
 */
export const SAVED_ADDRESS_FIELDS: readonly string[] = [
  'email',
  'firstName',
  'lastName',
  'phone',
  'country',
  'region',
  'street',
  'streetNumber',
  'city',
  'zipcode',
]

// Django's order-create field names (camelCased by the API) that live
// on the address step, mapped to that step's ``UFormField`` names.
const ADDRESS_STEP_FIELDS: Record<string, string> = {
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  countryId: 'country',
  regionId: 'region',
  city: 'city',
  zipcode: 'zipcode',
  street: 'street',
  streetNumber: 'streetNumber',
  customerNotes: 'customerNotes',
  documentType: 'documentType',
  billingVatId: 'billingVatId',
  billingCompanyName: 'billingCompanyName',
  billingTaxOffice: 'billingTaxOffice',
  billingActivity: 'billingActivity',
  billingStreet: 'billingStreet',
  billingStreetNumber: 'billingStreetNumber',
  billingCity: 'billingCity',
  billingZipcode: 'billingZipcode',
}

/**
 * The `code` of the 409 Django answers while a request with the same
 * idempotency key is still being processed (`core/middleware/idempotency.py`).
 * Not part of the OpenAPI contract: the middleware answers before any view.
 */
const IDEMPOTENCY_IN_FLIGHT = 'idempotency_in_flight'

type Translate = (key: string, params?: Record<string, unknown>) => string

export interface OrderErrorInfo {
  title: string
  description?: string
  /**
   * Only an expired stock hold is retryable: the caller drops the dead
   * reservation ids and re-submits, which re-reserves.
   */
  shouldRetry: boolean
  /** Django field errors the address step owns, one per input. */
  addressStepErrors: FormError[]
}

/**
 * What to tell the shopper about a rejected `POST /api/orders`, from the
 * error body Django sent (`response._data`).
 *
 * First an order still being placed under the same idempotency key.
 * Then branches on Django's stable `error.type` (`OrderCreateErrorType` in
 * the OpenAPI contract), never on `detail` / `cart` TEXT: Django answers
 * in the page's language, so a message match works in one language at
 * most. Then a `cart` field error (a missing or empty cart), then a DRF
 * field-error map (each message under its translated label), then any
 * `detail`, then the generic title.
 */
export function classifyOrderError(errorData: any, t: Translate): OrderErrorInfo {
  let errorTitle = t('form.submit.error.general')
  let errorDescription: string | undefined
  let addressStepErrors: FormError[] = []

  const errorType = errorData?.error?.type as OrderCreateErrorType | undefined
  const cartMessages = Array.isArray(errorData?.cart) ? errorData.cart.join('. ') : ''

  // The first submit with this key is still being placed. Its answer
  // is not known yet, so nothing is wrong with the order: the key is
  // kept (`rejectionSettlesAttempt`), and a later submit replays it.
  if (errorData?.code === IDEMPOTENCY_IN_FLIGHT) {
    return {
      title: t('form.submit.error.order_in_progress'),
      description: t('form.submit.error.order_in_progress_description'),
      shouldRetry: false,
      addressStepErrors,
    }
  }
  if (errorType === 'reservation_unavailable') {
    return {
      title: t('form.submit.error.reservation_expired'),
      description: t('form.submit.error.reservation_expired_description'),
      shouldRetry: true,
      addressStepErrors,
    }
  }
  else if (errorType === 'invalid_order_data') {
    errorTitle = t('form.submit.error.invalid_order_data')
    errorDescription = errorData?.detail || t('form.submit.error.invalid_order_data_description')
  }
  else if (errorType === 'insufficient_stock') {
    errorTitle = t('form.submit.error.insufficient_stock')
    errorDescription = cartMessages || errorData?.detail || t('form.submit.error.insufficient_stock_description')
  }
  else if (errorType === 'cart_invalid') {
    errorTitle = t('form.submit.error.inventory')
    errorDescription = cartMessages || errorData?.detail
  }
  else if (errorType === 'payment_not_found' || errorType === 'payment_verification') {
    errorTitle = t('form.submit.error.payment_verification')
    errorDescription = errorData?.detail || t('form.submit.error.payment_verification_description')
  }
  // The paid intent no longer matches the order Django priced: the
  // cart or its prices changed after the intent was created.
  else if (errorType === 'payment_amount_mismatch' || errorType === 'payment_currency_mismatch') {
    errorTitle = t('form.submit.error.payment_mismatch')
    errorDescription = errorData?.detail || t('form.submit.error.payment_mismatch_description')
  }
  else if (errorType === 'invalid_coupon') {
    errorTitle = t('form.submit.error.invalid_coupon')
    errorDescription = errorData?.detail || t('form.submit.error.invalid_coupon_description')
  }
  else if (errorType === 'invalid_gift_card') {
    errorTitle = t('form.submit.error.invalid_gift_card')
    errorDescription = errorData?.detail || t('form.submit.error.invalid_gift_card_description')
  }
  // A cart that is missing or empty: DRF's field error under `cart`
  else if (cartMessages) {
    errorTitle = t('form.submit.error.inventory')
    errorDescription = cartMessages
  }
  // DRF serializer field errors: { field: ["msg", ...] } — e.g.
  // {"phone": ["Enter a valid phone number."]}. Surface every message
  // under its translated form label so the customer sees exactly what
  // to fix instead of the generic failure toast. Field-level Zod
  // validation should catch these first — this is the safety net for
  // rules only Django knows about.
  else if (isDrfFieldErrorMap(errorData)) {
    errorTitle = t('form.submit.error.invalid_order_data')
    errorDescription = formatDrfFieldErrors(errorData, t)
    // A field the address step owns: the caller goes back there and
    // shows each message under its own input, not only in the toast.
    addressStepErrors = Object.entries(errorData).flatMap(([field, messages]) => {
      const name = ADDRESS_STEP_FIELDS[field]
      return name ? messages.map(message => ({ name, message })) : []
    })
  }
  // Fallback to detail
  else if (errorData?.detail) {
    errorTitle = t('form.submit.error.general')
    errorDescription = errorData.detail
  }

  return { title: errorTitle, description: errorDescription, shouldRetry: false, addressStepErrors }
}

/** The checkout state an order body is built from, besides the form. */
export interface OrderCreateBodyContext {
  /** The `Country` row matching `formState.country` — drives phone normalisation. */
  selectedCountry: PhoneCountry | undefined
  loyaltyDiscount: { points: number } | null
  giftCards: { code: string }[]
  /** Meta dedup ids, `null` without ad-storage consent. */
  meta: Record<string, unknown> | null
  /** Where this tab's visit came from, `null` when nothing was captured. */
  attribution: Omit<OrderAttributionInputRequest, 'agentProtocol'> | null
}

/**
 * The `POST /api/orders` body for the checkout form.
 *
 * Maps the local shipping radio to the registry-driven (provider code,
 * kind) pair the API expects: home delivery sends only `shippingKind`
 * and lets Django's auto-router pick the active home-delivery provider;
 * a pickup-point carrier adds its own fields via its `buildOrderPayload`
 * — adding ELTA / Speedex requires no edits here.
 */
export function buildOrderCreateBody(
  formState: Record<string, any>,
  ctx: OrderCreateBodyContext,
): OrderCreateFromCartRequest {
  const carrier = carrierForMethod(formState.shippingMethod)
  const shippingKind = formState.shippingMethod === 'home_delivery'
    ? 'home_delivery'
    : 'pickup_point'
  const carrierPayload = carrier?.buildOrderPayload?.(formState) ?? {}

  return {
    payWayId: formState.payWayId,
    countryId: formState.countryId!,
    regionId: formState.regionId,
    firstName: formState.firstName,
    lastName: formState.lastName,
    email: formState.email,
    street: formState.street,
    streetNumber: formState.streetNumber,
    city: formState.city,
    // Canonical form, the same one Django stores.
    zipcode: normalizePostcode(formState.zipcode),
    // ``FormPhoneInput`` already holds E.164, built from the phone
    // country the shopper picked (a Greek mobile shipping to a Cypriot
    // locker keeps +30). Normalising here passes it through; it only
    // reads a bare number against the delivery country.
    phone: normalizePhone(formState.phone, ctx.selectedCountry),
    customerNotes: formState.customerNotes,
    // B2B billing — only meaningful when documentType=INVOICE. The
    // server strips EL/GR prefix and uppercases country, but we
    // send whatever the user entered; empty strings are tolerated.
    documentType: formState.documentType,
    billingVatId: formState.billingVatId || undefined,
    billingCountry: formState.billingCountry || undefined,
    // Company requisites travel ONLY on INVOICE orders — a retail
    // receipt must not carry stray billing columns. "Same as
    // delivery" resolves client-side so the payload always carries
    // the actual invoice address; Django applies the same copy
    // server-side for direct API callers that send blanks.
    ...(formState.documentType === zOrderCreateDocumentType.enum.INVOICE
      ? {
          billingCompanyName: formState.billingCompanyName || undefined,
          billingTaxOffice: formState.billingTaxOffice || undefined,
          billingActivity: formState.billingActivity || undefined,
          billingStreet: (formState.billingSameAsShipping
            ? formState.street
            : formState.billingStreet) || undefined,
          billingStreetNumber: (formState.billingSameAsShipping
            ? formState.streetNumber
            : formState.billingStreetNumber) || undefined,
          billingCity: (formState.billingSameAsShipping
            ? formState.city
            : formState.billingCity) || undefined,
          billingZipcode: (formState.billingSameAsShipping
            ? formState.zipcode
            : formState.billingZipcode) || undefined,
        }
      : {}),
    loyaltyPointsToRedeem: ctx.loyaltyDiscount?.points ?? undefined,
    giftCardCodes: ctx.giftCards.length
      ? ctx.giftCards.map(card => card.code)
      : undefined,
    shippingProviderCode: carrier?.code,
    shippingKind,
    ...carrierPayload,
    ...(ctx.meta ? { meta: ctx.meta } : {}),
    ...(ctx.attribution ? { attribution: ctx.attribution } : {}),
  } as OrderCreateFromCartRequest
}

/** The HTTP status a failed `$api` call carries, `undefined` when no response came back. */
export function failedStatusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { status, response } = error as { status?: unknown, response?: { status?: unknown } }
  const code = status ?? response?.status
  return typeof code === 'number' ? code : undefined
}

/**
 * Whether a failed order request settles the checkout attempt, so the
 * next submit needs a new idempotency key.
 *
 * Django caches every 4xx under the key for 24 hours and replays it, so a
 * rejection is final for that key: a repeat would only be answered with
 * the same rejection. Three outcomes leave the question open and keep
 * the key, because the repeat must find the order if it was created: no
 * response at all (a dropped connection), a 5xx (never cached), and the
 * 409 Django answers while the same key is still being processed.
 */
export function rejectionSettlesAttempt(status: number | undefined): boolean {
  return status !== undefined && status < 500 && status !== 409
}
