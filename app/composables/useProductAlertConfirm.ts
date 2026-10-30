/** Where the product alert confirmation stands. */
export type ProductAlertConfirmPhase = 'idle' | 'confirmed' | 'expired' | 'invalid' | 'failed'

/**
 * Starting a guest's product alert from the link in the email, apart from
 * its drawing (`Storefront/ProductAlertConfirm` and the tenants' own).
 *
 * Opening the link starts NOTHING: mail providers and link scanners
 * prefetch URLs in messages, and a GET that confirmed would subscribe
 * people who never clicked. The visitor presses the button, and
 * `confirm()` POSTs the token (`server/api/products/alerts/confirm/[token].post.ts`).
 * Django then answers 200 (`confirmed`, with the `kind` of alert it
 * started), 410 (the week-long link has `expired`) or 400 (`invalid`:
 * unknown, tampered, or the alert is no longer pending); anything else is `failed`. One press
 * at a time (`confirming`).
 */
export function useProductAlertConfirm(options: { token: () => string }) {
  const phase = ref<ProductAlertConfirmPhase>('idle')
  const confirming = ref(false)
  const kind = ref<ProductAlertKindEnum>('restock')

  async function confirm() {
    if (confirming.value) return
    confirming.value = true
    try {
      const response = await $api(
        `/api/products/alerts/confirm/${encodeURIComponent(options.token())}`,
        { method: 'POST' },
      )
      kind.value = response.kind
      phase.value = 'confirmed'
    }
    catch (error) {
      const { status } = describeApiError(error)
      phase.value = status === 410
        ? 'expired'
        : status === 400
          ? 'invalid'
          : 'failed'
    }
    finally {
      confirming.value = false
    }
  }

  return { phase, confirming, kind, confirm }
}
