import type { FormError } from '@nuxt/ui'

/** The checkout's steps, by their index in the page's stepper. */
export const CHECKOUT_STEP = { details: 0, delivery: 1, payment: 2 } as const
export type CheckoutStep = typeof CHECKOUT_STEP[keyof typeof CHECKOUT_STEP]

/**
 * The details step's fields a picked saved address stands for: its card
 * replaces their inputs (``StepPersonalInfo``'s ``saved`` mode), so an
 * error on one of them has nowhere to show until the fields are opened.
 */
export const SAVED_ADDRESS_FIELDS: readonly string[] = [
  'email',
  'firstName',
  'lastName',
  'phone',
  'country',
]

/**
 * The address a home delivery is sent to, asked on the delivery step:
 * a pickup order is delivered to the point and sends none of it.
 */
export const DELIVERY_ADDRESS_FIELDS: readonly string[] = [
  'street',
  'streetNumber',
  'city',
  'zipcode',
  'region',
]

// Django's order-create field names (camelCased by the API), mapped to
// the step that renders each and its ``UFormField`` name there. A
// refused pickup point (``pickup_point_unknown``, ``_required``,
// ``_in_another_country``) is an error on the carrier's own field, the
// one its picker sits in.
const ORDER_FIELD_STEPS: Record<string, { step: CheckoutStep, name: string }> = {
  firstName: { step: CHECKOUT_STEP.details, name: 'firstName' },
  lastName: { step: CHECKOUT_STEP.details, name: 'lastName' },
  email: { step: CHECKOUT_STEP.details, name: 'email' },
  phone: { step: CHECKOUT_STEP.details, name: 'phone' },
  countryId: { step: CHECKOUT_STEP.details, name: 'country' },
  customerNotes: { step: CHECKOUT_STEP.details, name: 'customerNotes' },
  regionId: { step: CHECKOUT_STEP.delivery, name: 'region' },
  city: { step: CHECKOUT_STEP.delivery, name: 'city' },
  zipcode: { step: CHECKOUT_STEP.delivery, name: 'zipcode' },
  street: { step: CHECKOUT_STEP.delivery, name: 'street' },
  streetNumber: { step: CHECKOUT_STEP.delivery, name: 'streetNumber' },
  boxnowLockerId: { step: CHECKOUT_STEP.delivery, name: 'boxnowLockerId' },
  acsStationExternalId: { step: CHECKOUT_STEP.delivery, name: 'acsStationExternalId' },
  acsStationBranch: { step: CHECKOUT_STEP.delivery, name: 'acsStationExternalId' },
  documentType: { step: CHECKOUT_STEP.delivery, name: 'documentType' },
  billingVatId: { step: CHECKOUT_STEP.delivery, name: 'billingVatId' },
  billingCompanyName: { step: CHECKOUT_STEP.delivery, name: 'billingCompanyName' },
  billingTaxOffice: { step: CHECKOUT_STEP.delivery, name: 'billingTaxOffice' },
  billingActivity: { step: CHECKOUT_STEP.delivery, name: 'billingActivity' },
  billingStreet: { step: CHECKOUT_STEP.delivery, name: 'billingStreet' },
  billingStreetNumber: { step: CHECKOUT_STEP.delivery, name: 'billingStreetNumber' },
  billingCity: { step: CHECKOUT_STEP.delivery, name: 'billingCity' },
  billingZipcode: { step: CHECKOUT_STEP.delivery, name: 'billingZipcode' },
}

/**
 * Django's refusals of the pickup point a pickup order names (#767), on
 * the carrier's own field: told in the storefront's words, each saying
 * to choose another point. A point Django could not check at all is the
 * 503 ``PICKUP_POINT_CHECK_UNAVAILABLE`` instead, which says to try again.
 */
const PICKUP_POINT_REFUSALS: readonly string[] = [
  'pickup_point_unknown',
  'pickup_point_required',
  'pickup_point_in_another_country',
]

/** Django's field errors by the step whose form shows each under its input. */
export type StepFieldErrors = Partial<Record<CheckoutStep, FormError[]>>

/**
 * The `code` of the 409 Django answers while a request with the same
 * idempotency key is still being processed (`core/middleware/idempotency.py`).
 * Not part of the OpenAPI contract: the middleware answers before any view.
 */
const IDEMPOTENCY_IN_FLIGHT = 'idempotency_in_flight'

/**
 * The `code` of the 409 Django answers when the order's `expectedTotal`
 * is not the amount due it computes under the cart lock; `error.quote`
 * is the quote the order would have been created at. Told by `code`
 * alone: its `error.type` is `invalid_order_data`, and
 * `OrderCreateErrorType` has no value of its own for it.
 */
const TOTAL_CHANGED = 'total_changed'

/**
 * The `code` of the 409 Django answers when the order's
 * `expectedCartDigest` is not the digest of the cart under the lock: the
 * order would be made of something else than the shopper was shown (a
 * line, a quantity, a promotion or the pickup point), whatever its
 * total. `error.quote` is the quote of the cart now. Told by `code` alone,
 * as `TOTAL_CHANGED`.
 */
const CART_CHANGED = 'cart_changed'

type Translate = (key: string, params?: Record<string, unknown>) => string
type FormatNumber = (value: number, format: string) => string

export interface OrderErrorInfo {
  title: string
  description?: string
  /**
   * Only an expired stock hold is retryable: the caller drops the dead
   * reservation ids and re-submits, which re-reserves.
   */
  shouldRetry: boolean
  /** Django's field errors, by the step that shows each under its input. */
  stepErrors: StepFieldErrors
  /**
   * Django refused the order for what it is now (`total_changed`,
   * `cart_changed`) and sent the quote it would be placed at: the caller
   * shows the cart and that quote, and the shopper's next submit accepts it.
   */
  quoteChanged: boolean
}

/**
 * What the shopper accepts with a click: the quote's `expectedTotal` and
 * `cartDigest` as Django sent them (never converted here). The order is
 * created only at that total and of that cart. The digest is `null` while
 * the quote has no delivery and pay way to digest.
 */
export interface AcceptedQuote {
  expectedTotal: ExpectedTotal
  cartDigest: string | null
}

/** What a quote lets the shopper accept, `null` while it has no total. */
export function acceptedQuoteOf(quote: Pick<CheckoutQuote, 'expectedTotal' | 'cartDigest'> | null | undefined): AcceptedQuote | null {
  return quote?.expectedTotal
    ? { expectedTotal: quote.expectedTotal, cartDigest: quote.cartDigest }
    : null
}

/**
 * What to tell the shopper when the order was about to be placed at a
 * total the page had not shown: the total, which the summary now shows,
 * and that placing the order again accepts it.
 */
export function describeTotalToConfirm(amountDue: number | null, t: Translate, n: FormatNumber): { title: string, description: string } {
  return {
    title: t('form.submit.error.total_confirm'),
    description: amountDue === null
      ? t('form.submit.error.total_changed_review')
      : t('form.submit.error.total_confirm_description', { total: n(amountDue, 'currency') }),
  }
}

/**
 * What to tell the shopper when the total changed before the order was
 * placed: the new amount due, which the summary now shows, and that
 * placing the order again accepts it. `null` when no total came with it.
 */
export function describeTotalChange(amountDue: number | null, t: Translate, n: FormatNumber): { title: string, description: string } {
  return {
    title: t('form.submit.error.total_changed'),
    description: amountDue === null
      ? t('form.submit.error.total_changed_review')
      : t('form.submit.error.total_changed_description', { total: n(amountDue, 'currency') }),
  }
}

/**
 * What to tell the shopper when the cart changed before the order was
 * placed (`cart_changed`, or a quote whose digest is not the one on the
 * page): its lines, which the summary now shows, the amount due now, and
 * that placing the order again accepts them. Without a total, only that.
 */
export function describeCartChange(amountDue: number | null, t: Translate, n: FormatNumber): { title: string, description: string } {
  return {
    title: t('form.submit.error.cart_changed'),
    description: amountDue === null
      ? t('form.submit.error.cart_changed_review')
      : t('form.submit.error.cart_changed_description', { total: n(amountDue, 'currency') }),
  }
}

/**
 * What to tell the shopper about a rejected `POST /api/orders`, from the
 * error body Django sent (`response._data`).
 *
 * First an order still being placed under the same idempotency key, then
 * a total or a cart that changed (`TOTAL_CHANGED`, `CART_CHANGED`, the
 * amount due now from the quote Django sent). Then branches on Django's stable `error.type` (`OrderCreateErrorType` in
 * the OpenAPI contract), never on `detail` / `cart` TEXT: Django answers
 * in the page's language, so a message match works in one language at
 * most. Then a `cart` field error (a missing or empty cart), then
 * Django's field errors (`apiFieldErrorsOf`: each message under its
 * translated label, and the address step's under their inputs), then any
 * `detail`, then the generic title.
 */
export function classifyOrderError(errorData: any, t: Translate, n: FormatNumber): OrderErrorInfo {
  let errorTitle = t('form.submit.error.general')
  let errorDescription: string | undefined
  const stepErrors: StepFieldErrors = {}

  const errorType = errorData?.error?.type as OrderCreateErrorType | undefined
  const cartMessages = Array.isArray(errorData?.cart) ? errorData.cart.join('. ') : ''
  // A refused pickup point is said in the storefront's words, under the
  // picker and in the alert alike.
  const isPickupRefusal = (error: DescribedFieldError) => Boolean(error.code && PICKUP_POINT_REFUSALS.includes(error.code))
  const fieldErrors = apiFieldErrorsOf(errorData).map(error => isPickupRefusal(error)
    ? { ...error, message: t(`form.submit.error.${error.code}`) }
    : error)
  const pickupPointRefused = fieldErrors.some(isPickupRefusal)

  // The first submit with this key is still being placed. Its answer
  // is not known yet, so nothing is wrong with the order: the key is
  // kept (`rejectionSettlesAttempt`), and a later submit replays it.
  if (errorData?.code === IDEMPOTENCY_IN_FLIGHT) {
    return {
      title: t('form.submit.error.order_in_progress'),
      description: t('form.submit.error.order_in_progress_description'),
      shouldRetry: false,
      stepErrors,
      quoteChanged: false,
    }
  }
  // The carrier's catalogue could not be asked: the point may be right,
  // so the shopper is asked to try again, never to choose another.
  if (errorData?.code === PICKUP_POINT_CHECK_UNAVAILABLE) {
    return {
      title: t('form.submit.error.pickup_point_check_unavailable'),
      description: t('form.submit.error.pickup_point_check_unavailable_description'),
      shouldRetry: false,
      stepErrors,
      quoteChanged: false,
    }
  }
  if (errorData?.code === TOTAL_CHANGED || errorData?.code === CART_CHANGED) {
    const quote = zCheckoutQuote.safeParse(errorData?.error?.quote)
    const amountDue = quote.success ? quote.data.amountDue : null
    return {
      ...(errorData.code === CART_CHANGED
        ? describeCartChange(amountDue, t, n)
        : describeTotalChange(amountDue, t, n)),
      shouldRetry: false,
      stepErrors,
      quoteChanged: true,
    }
  }
  if (errorType === 'reservation_unavailable') {
    return {
      title: t('form.submit.error.reservation_expired'),
      description: t('form.submit.error.reservation_expired_description'),
      shouldRetry: true,
      stepErrors,
      quoteChanged: false,
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
  // Django's field errors (`fields`, e.g. `street_number_is_postcode` on
  // `streetNumber`). Surface every message under its translated form
  // label so the customer sees exactly what to fix instead of the generic
  // failure toast. Field-level Zod validation should catch these first —
  // this is the safety net for rules only Django knows about.
  else if (fieldErrors.length) {
    errorTitle = t(pickupPointRefused ? 'form.submit.error.pickup_point_refused' : 'form.submit.error.invalid_order_data')
    // A refused pickup point leads, in its own words; every other field
    // Django refused follows, so the alert never hides one.
    const otherErrors = fieldErrors.filter(error => !isPickupRefusal(error))
    errorDescription = [
      ...fieldErrors.filter(isPickupRefusal).map(error => error.message),
      ...(otherErrors.length ? [formatFieldErrors(otherErrors, t)] : []),
    ].join('\n')
    // A field a step shows: the caller goes back to the first such step
    // and shows each message under its own input, not only in the alert.
    for (const { name, message } of fieldErrors) {
      const field = ORDER_FIELD_STEPS[name]
      if (field) (stepErrors[field.step] ??= []).push({ name: field.name, message })
    }
  }
  // Fallback to detail
  else if (errorData?.detail) {
    errorTitle = t('form.submit.error.general')
    errorDescription = errorData.detail
  }

  return { title: errorTitle, description: errorDescription, shouldRetry: false, stepErrors, quoteChanged: false }
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

/** An order body before the quote it is placed at (`placeOrderAt`). */
export type OrderChoices = Omit<OrderCreateFromCartRequestWritable, 'expectedTotal' | 'expectedCartDigest'>

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
): OrderChoices {
  const carrier = carrierForMethod(formState.shippingMethod)
  const shippingKind = formState.shippingMethod === 'home_delivery'
    ? 'home_delivery'
    : 'pickup_point'
  const carrierPayload = carrier?.buildOrderPayload?.(formState) ?? {}
  const sharedBilling = billingSharesDelivery(formState)

  return {
    payWayId: formState.payWayId,
    countryId: formState.countryId!,
    firstName: formState.firstName,
    lastName: formState.lastName,
    email: formState.email,
    // The address a home delivery goes to. A pickup order sends none:
    // Django delivers it to the point's address and keeps none of the
    // shopper's, the region included (``_deliver_to_pickup_point``).
    ...(shippingKind === 'home_delivery'
      ? {
          regionId: formState.regionId,
          street: formState.street,
          streetNumber: formState.streetNumber,
          city: formState.city,
          // Canonical form, the same one Django stores.
          zipcode: normalizePostcode(formState.zipcode),
        }
      : {}),
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
    // delivery" (a home delivery's only: a pickup point is no company's
    // address) resolves client-side so the payload always carries the
    // actual invoice address; Django applies the same copy server-side
    // for direct API callers that send blanks.
    ...(formState.documentType === zOrderCreateDocumentType.enum.INVOICE
      ? {
          billingCompanyName: formState.billingCompanyName || undefined,
          billingTaxOffice: formState.billingTaxOffice || undefined,
          billingActivity: formState.billingActivity || undefined,
          billingStreet: (sharedBilling
            ? formState.street
            : formState.billingStreet) || undefined,
          billingStreetNumber: (sharedBilling
            ? formState.streetNumber
            : formState.billingStreetNumber) || undefined,
          billingCity: (sharedBilling
            ? formState.city
            : formState.billingCity) || undefined,
          billingZipcode: (sharedBilling
            ? formState.zipcode
            : formState.billingZipcode) || undefined,
        }
      : {}),
    // What the shopper ticked on the payment step; Django records the
    // texts in force with the order.
    termsAccepted: formState.termsAccepted,
    loyaltyPointsToRedeem: ctx.loyaltyDiscount?.points ?? undefined,
    giftCardCodes: ctx.giftCards.length
      ? ctx.giftCards.map(card => card.code)
      : undefined,
    shippingProviderCode: carrier?.code,
    shippingKind,
    ...carrierPayload,
    ...(ctx.meta ? { meta: ctx.meta } : {}),
    ...(ctx.attribution ? { attribution: ctx.attribution } : {}),
  }
}

/**
 * The order body placed at the quote the shopper accepted: Django creates
 * it only at that `expectedTotal` and, once the quote digested a delivery
 * and a pay way, only of that cart (`expectedCartDigest`; a 409
 * `cart_changed` otherwise).
 */
export function placeOrderAt(choices: OrderChoices, accepted: AcceptedQuote): OrderCreateFromCartRequestWritable {
  return {
    ...choices,
    expectedTotal: accepted.expectedTotal,
    ...(accepted.cartDigest ? { expectedCartDigest: accepted.cartDigest } : {}),
  }
}

/** The choices of an order the shopper has reached, so a quote may price them. */
export interface QuotedChoices {
  /** The delivery step was reached: the delivery and the address's email count. */
  delivery: boolean
  /** The payment step was reached: the pay way counts. */
  payWay: boolean
}

/**
 * The `POST /api/cart/quote` body for an order body: its pricing inputs,
 * taken from that body so the quote prices exactly what the order will
 * carry. A choice the shopper has not reached is left out, and Django
 * then leaves its rows and the total null rather than price what the
 * form pre-selected: the delivery (and the email, which promotions may
 * read, once the address step validated it) until the delivery step,
 * the pay way until the payment step.
 */
export function quoteRequestOf(order: OrderChoices, chosen: QuotedChoices): CartQuoteRequestRequest {
  return {
    countryId: order.countryId || undefined,
    regionId: order.regionId || undefined,
    giftCardCodes: order.giftCardCodes,
    loyaltyPointsToRedeem: order.loyaltyPointsToRedeem,
    ...(chosen.delivery
      ? {
          shippingKind: order.shippingKind,
          shippingProviderCode: order.shippingProviderCode || undefined,
          email: order.email || undefined,
          // The pickup point, as the order carries it: Django prices none,
          // but the quote's `cartDigest` covers it, so the order's matches.
          boxnowLockerId: order.boxnowLockerId,
          acsStationExternalId: order.acsStationExternalId,
          acsStationBranch: order.acsStationBranch,
        }
      : {}),
    ...(chosen.payWay ? { payWayId: order.payWayId } : {}),
  }
}

/**
 * Whether the invoice goes to the delivery address: the shopper left
 * "same as delivery" ticked AND the order is delivered to an address. A
 * pickup point is no company's address, so its invoice names its own
 * (Django refuses one without).
 */
export function billingSharesDelivery(form: { shippingMethod?: string, billingSameAsShipping?: boolean }): boolean {
  return form.shippingMethod === 'home_delivery' && form.billingSameAsShipping !== false
}

/** Whether two expected totals are the same amount in the same currency. */
export function sameExpectedTotal(a: ExpectedTotal | null | undefined, b: ExpectedTotal | null | undefined): boolean {
  return Boolean(a && b && a.amount === b.amount && a.currency === b.currency)
}

/**
 * How the quote an order would be placed at differs from the one the
 * shopper accepted: `total` when the amount moved, `cart` when only what
 * the order is made of did (the digest), `null` when it is the same.
 */
export function acceptedQuoteChange(priced: AcceptedQuote, accepted: AcceptedQuote | null): 'total' | 'cart' | null {
  if (!sameExpectedTotal(priced.expectedTotal, accepted?.expectedTotal)) return 'total'
  return priced.cartDigest === accepted?.cartDigest ? null : 'cart'
}

/** What a refused `$api` call got back: ofetch's `FetchError.response`. */
export interface RefusedResponse {
  status: number
  statusText?: string
  headers?: Headers
  _data?: unknown
}

/**
 * The answer a failed `$api` call got, `undefined` when it got none (a
 * dropped connection, a timeout): a refusal the shopper can be told about,
 * apart from a request that never reached a decision.
 */
export function refusedResponseOf(error: unknown): RefusedResponse | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { response } = error as { response?: unknown }
  if (typeof response !== 'object' || response === null) return undefined
  return typeof (response as { status?: unknown }).status === 'number'
    ? response as RefusedResponse
    : undefined
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
 * the same rejection. Its 409s are refusals like any other
 * (`legal_document_unavailable`, `total_changed`). Three outcomes leave
 * the question open and keep the key, because the repeat must find the
 * order if it was created: no response at all (a dropped connection), a
 * 5xx (never cached), and the 409 `idempotency_in_flight` Django answers
 * while the same key is still being processed, before any view runs.
 */
export function rejectionSettlesAttempt(error: unknown): boolean {
  const status = failedStatusOf(error)
  return status !== undefined && status < 500 && apiErrorBodyOf(error)?.code !== IDEMPOTENCY_IN_FLIGHT
}

/**
 * Receipt or invoice. Anything but an invoice wipes every billing field:
 * a VAT id left behind would still reach Django, and an invoice would be
 * issued to a company the shopper un-picked.
 */
export function setDocumentType(form: Record<string, unknown>, type: OrderCreateDocumentType): void {
  form.documentType = type
  if (type === zOrderCreateDocumentType.enum.INVOICE) return
  Object.assign(form, {
    billingVatId: '',
    billingCountry: '',
    billingCompanyName: '',
    billingTaxOffice: '',
    billingActivity: '',
    billingSameAsShipping: true,
    billingStreet: '',
    billingStreetNumber: '',
    billingCity: '',
    billingZipcode: '',
  })
}
