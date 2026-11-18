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

/**
 * The `code` of the 409 Django answers when the order's `expectedTotal`
 * is not the amount due it computes under the cart lock; `error.quote`
 * is the quote the order would have been created at. Told by `code`:
 * its `error.type` stays `invalid_order_data` until every client lists
 * the new `OrderCreateErrorType` value (`docs/order/creation.md` §3.0
 * in the Django repo).
 */
const TOTAL_CHANGED = 'total_changed'

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
  /** Django field errors the address step owns, one per input. */
  addressStepErrors: FormError[]
  /**
   * Django priced the order at another total than the one sent: the
   * caller shows the new quote, and the shopper's next submit sends it.
   */
  totalChanged: boolean
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
 * What to tell the shopper about a rejected `POST /api/orders`, from the
 * error body Django sent (`response._data`).
 *
 * First an order still being placed under the same idempotency key, then
 * a total that changed (`TOTAL_CHANGED`, its new amount from the quote
 * Django sent). Then branches on Django's stable `error.type` (`OrderCreateErrorType` in
 * the OpenAPI contract), never on `detail` / `cart` TEXT: Django answers
 * in the page's language, so a message match works in one language at
 * most. Then a `cart` field error (a missing or empty cart), then a DRF
 * field-error map (each message under its translated label), then any
 * `detail`, then the generic title.
 */
export function classifyOrderError(errorData: any, t: Translate, n: FormatNumber): OrderErrorInfo {
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
      totalChanged: false,
    }
  }
  if (errorData?.code === TOTAL_CHANGED) {
    const quote = zCheckoutQuote.safeParse(errorData?.error?.quote)
    return {
      ...describeTotalChange(quote.success ? quote.data.amountDue : null, t, n),
      shouldRetry: false,
      addressStepErrors,
      totalChanged: true,
    }
  }
  if (errorType === 'reservation_unavailable') {
    return {
      title: t('form.submit.error.reservation_expired'),
      description: t('form.submit.error.reservation_expired_description'),
      shouldRetry: true,
      addressStepErrors,
      totalChanged: false,
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

  return { title: errorTitle, description: errorDescription, shouldRetry: false, addressStepErrors, totalChanged: false }
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
  /**
   * The quote's `expectedTotal` the shopper was shown, copied as Django
   * sent it (cents and currency, never converted here): the order is then
   * created only at that total. `null` builds a body to quote from.
   */
  expectedTotal: ExpectedTotal | null
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
): OrderCreateFromCartRequestWritable {
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
    ...(ctx.expectedTotal ? { expectedTotal: ctx.expectedTotal } : {}),
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
export function quoteRequestOf(order: OrderCreateFromCartRequestWritable, chosen: QuotedChoices): CartQuoteRequestRequest {
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
        }
      : {}),
    ...(chosen.payWay ? { payWayId: order.payWayId } : {}),
  }
}

/** Whether two expected totals are the same amount in the same currency. */
export function sameExpectedTotal(a: ExpectedTotal | null | undefined, b: ExpectedTotal | null | undefined): boolean {
  return Boolean(a && b && a.amount === b.amount && a.currency === b.currency)
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
