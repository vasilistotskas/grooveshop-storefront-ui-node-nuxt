/**
 * Where a gift-card payment lands (`/gift-cards/success?purchase=<uuid>`):
 * the purchase's state, polled until the provider's webhook settles it.
 * A landing without a purchase is a failed one, and asks Django nothing.
 *
 * Shared by every drawing of the page (`Storefront/GiftCardsSuccess.vue`
 * and the webside copy). Call it from the body's `<script setup>`.
 */
export type GiftCardPurchaseStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'UNKNOWN'

// The Viva redirect races the provider webhook — poll until the
// purchase flips PAID/FAILED/CANCELED, then stop. After the attempt
// budget the page says "still processing": the webhook WILL settle it
// and the buyer gets the receipt and delivery emails anyway.
const MAX_ATTEMPTS = 20
const POLL_INTERVAL_MS = 3000

export function useGiftCardPurchaseStatus() {
  const route = useRoute()

  const purchaseUuid = computed(() =>
    typeof route.query.purchase === 'string' ? route.query.purchase : null)

  const status = ref<GiftCardPurchaseStatus>(
    purchaseUuid.value ? 'PENDING' : 'UNKNOWN',
  )
  const attempts = ref(0)
  const isActive = ref(true)
  /** Still pending once the polling budget is spent. */
  const timedOut = computed(() =>
    status.value === 'PENDING' && attempts.value >= MAX_ATTEMPTS)

  const poll = async () => {
    if (!purchaseUuid.value || !isActive.value) return
    try {
      const response = await $api<{ purchaseUuid: string, status: string }>(
        '/api/giftcard/purchase-status',
        { query: { uuid: purchaseUuid.value } },
      )
      const next = response.status?.toUpperCase()
      if (next === 'PAID' || next === 'FAILED' || next === 'CANCELED') {
        status.value = next
        return
      }
    }
    catch (error) {
      log.warn({ tag: 'giftcard', message: 'purchase-status poll failed', error })
    }
    attempts.value++
    if (attempts.value < MAX_ATTEMPTS && isActive.value) {
      setTimeout(poll, POLL_INTERVAL_MS)
    }
  }

  onMounted(() => {
    if (purchaseUuid.value) poll()
  })

  onBeforeUnmount(() => {
    isActive.value = false
  })

  return { status, timedOut }
}
