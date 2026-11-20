<script lang="ts" setup>
/**
 * «Pay now» for an order that waits for its online payment: what is due,
 * until when it can be paid (`paymentHoldExpiresAt`), and a button that asks
 * Django for a new payment link for the same order and sends the browser to
 * the provider (`useOrderCheckoutSession`). A canceled payment returns to
 * the order's page.
 *
 * It draws nothing for an order Django offers no link for
 * (`offersPaymentLink`). When the deadline passes on the open page, or Django
 * refuses the link as closed (`PAYMENT_LINK_CLOSED_CODES`), it says so in
 * place of the button and emits `closed`, so the page can read the order
 * again; any other failure keeps the button, to try again.
 *
 * One component for every design: the account's order page and the order
 * confirmation, and, as a `reminder` naming the order and linking to it, the
 * cart and the checkout (`OrderAwaitingPaymentReminder`).
 */
const props = defineProps<{
  order: OrderDetail
  /** The cart's and the checkout's reminder of an order placed earlier. */
  reminder?: boolean
}>()

const emit = defineEmits<{
  closed: []
}>()

const { t, n, locale } = useStoreI18n('components/Order/PayNow')
const localePath = useLocalePath()
const { user } = useUserSession()
const { open } = useOrderCheckoutSession()

const opening = ref(false)
const failure = ref<DescribedApiError | null>(null)
/** Django's refusal that ended the offer. */
const refusal = ref<DescribedApiError | null>(null)
const expired = ref(false)

const orderPage = computed(() => localePath(orderPageLocation(props.order, user.value?.id)))

const offer = computed<'closed' | 'expired' | 'open' | null>(() => {
  if (refusal.value) return 'closed'
  if (!offersPaymentLink(props.order)) return null
  return expired.value ? 'expired' : 'open'
})

// The deadline is read against the browser's clock after mounting, so the
// server's clock never decides what the page hydrates with; it may pass
// while the page is open.
let deadlineTimer: ReturnType<typeof setTimeout> | undefined
function followDeadline(deadline: string | null) {
  clearTimeout(deadlineTimer)
  const left = deadline ? Date.parse(deadline) - Date.now() : Number.POSITIVE_INFINITY
  expired.value = left <= 0
  if (left > 0 && Number.isFinite(left)) {
    deadlineTimer = setTimeout(() => {
      expired.value = true
      emit('closed')
    }, left)
  }
}

onMounted(() => {
  watch(() => props.order.paymentHoldExpiresAt, followDeadline, { immediate: true })
})

onBeforeUnmount(() => {
  clearTimeout(deadlineTimer)
})

async function pay() {
  if (opening.value) return
  opening.value = true
  failure.value = null
  try {
    window.location.href = await open(props.order, orderPage.value)
  }
  catch (error) {
    const described = describeApiError(error, { title: t('error_title'), fallback: t('error_fallback') })
    log.error({ action: 'order:payNow', code: described.code, error })
    if (described.code && PAYMENT_LINK_CLOSED_CODES.includes(described.code)) {
      refusal.value = described
      emit('closed')
    }
    else {
      failure.value = described
    }
    opening.value = false
  }
}
</script>

<template>
  <UAlert
    v-if="offer === 'closed'"
    color="neutral"
    variant="subtle"
    icon="i-lucide-circle-x"
    role="status"
    :title="t('closed_title')"
    :description="refusal?.description"
  />
  <UAlert
    v-else-if="offer === 'expired'"
    color="neutral"
    variant="subtle"
    icon="i-lucide-clock"
    role="status"
    :title="t('expired.title')"
    :description="t('expired.description')"
  />
  <div
    v-else-if="offer === 'open'"
    class="flex flex-col gap-3"
  >
    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-credit-card"
      :title="reminder ? t('reminder.title', { id: order.id }) : t('title')"
    >
      <template #description>
        <i18n-t
          :keypath="reminder ? 'reminder.description' : 'description'"
          tag="span"
        >
          <template #amount>
            <strong class="font-semibold">{{ n(order.amountDue, 'currency') }}</strong>
          </template>
          <template #deadline>
            <NuxtTime
              :datetime="order.paymentHoldExpiresAt!"
              :locale="locale"
              day="numeric"
              month="short"
              hour="2-digit"
              minute="2-digit"
              class="font-semibold"
            />
          </template>
        </i18n-t>
      </template>
      <template #actions>
        <UButton
          :label="t('pay')"
          :loading="opening"
          icon="i-lucide-lock"
          color="primary"
          size="md"
          @click="pay"
        />
        <UButton
          v-if="reminder"
          :label="t('reminder.view')"
          :to="orderPage"
          color="neutral"
          variant="outline"
          size="md"
        />
      </template>
    </UAlert>
    <ApiErrorAlert :error="failure" />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Η πληρωμή εκκρεμεί
  description: Πλήρωσε {amount} έως {deadline} για να ολοκληρωθεί η παραγγελία σου.
  pay: Πληρωμή τώρα
  reminder:
    title: "Η παραγγελία #{id} περιμένει την πληρωμή σου"
    description: Πλήρωσε {amount} έως {deadline}, αντί να παραγγείλεις ξανά τα ίδια προϊόντα.
    view: Δες την παραγγελία
  expired:
    title: Ο χρόνος πληρωμής έληξε
    description: Η παραγγελία θα ακυρωθεί. Για να αγοράσεις αυτά τα προϊόντα, κάνε νέα παραγγελία.
  closed_title: Η παραγγελία δεν πληρώνεται πια
  error_title: Η πληρωμή δεν ξεκίνησε
  error_fallback: Δεν ανοίξαμε τη σελίδα πληρωμής. Δοκίμασε ξανά.
en:
  title: Payment pending
  description: Pay {amount} by {deadline} to complete your order.
  pay: Pay now
  reminder:
    title: "Order #{id} is waiting for your payment"
    description: Pay {amount} by {deadline} instead of ordering the same items again.
    view: View order
  expired:
    title: The time to pay has run out
    description: The order will be canceled. To buy these items, place a new order.
  closed_title: This order can no longer be paid
  error_title: The payment did not start
  error_fallback: We could not open the payment page. Please try again.
</i18n>
