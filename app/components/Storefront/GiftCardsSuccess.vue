<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('title'),
})

const breadcrumb = computed(() => [
  { label: t('gift_cards'), to: '/gift-cards' },
  { label: t('title') },
])

const purchaseUuid = computed(() =>
  typeof route.query.purchase === 'string' ? route.query.purchase : null)

// The Viva redirect races the provider webhook — poll until the
// purchase flips PAID/FAILED/CANCELED, then stop. After the attempt
// budget we show the "still processing" state: the webhook WILL
// settle it and the buyer gets the receipt + delivery emails anyway.
const MAX_ATTEMPTS = 20
const POLL_INTERVAL_MS = 3000

const status = ref<'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'UNKNOWN'>(
  purchaseUuid.value ? 'PENDING' : 'UNKNOWN',
)
const attempts = ref(0)
const isActive = ref(true)
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

// One state at a time: a tinted tile with its icon, the headline, what
// it means, and the way on.
const view = computed(() => {
  if (status.value === 'PAID') {
    return { key: 'paid', icon: 'i-lucide-check', tile: 'bg-(--ui-success-soft)', action: 'continue' }
  }
  if (status.value === 'FAILED' || status.value === 'CANCELED' || status.value === 'UNKNOWN') {
    return { key: 'failed', icon: 'i-lucide-x', tile: 'bg-(--ui-error-soft)', action: 'retry' }
  }
  if (timedOut.value) {
    return { key: 'processing', icon: 'i-lucide-clock', tile: 'bg-(--ui-warning-soft)', action: null }
  }
  return { key: 'pending', icon: 'i-lucide-refresh-cw', tile: 'bg-(--ui-secondary-soft)', action: null }
})
</script>

<template>
  <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
    <PageBreadcrumb :items="breadcrumb" />

    <header>
      <h1
        class="
          font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[2.25rem]/[1.1]
        "
      >
        {{ t('title') }}
      </h1>
    </header>

    <section
      class="
        flex max-w-xl flex-col items-start gap-4 rounded-[1.25rem] bg-default
        p-5 ring ring-default
        sm:p-6
      "
      role="status"
    >
      <span
        class="flex size-12 items-center justify-center rounded-xl"
        :class="view.tile"
      >
        <UIcon
          :name="view.icon"
          class="size-6 text-highlighted"
          :class="view.key === 'pending' ? 'animate-spin' : ''"
        />
      </span>
      <h2 class="font-display text-xl font-bold text-highlighted">
        {{ t(`${view.key}.title`) }}
      </h2>
      <p class="text-toned">
        {{ t(`${view.key}.description`) }}
      </p>
      <UButton
        v-if="view.action === 'continue'"
        :to="localePath('index')"
        color="neutral"
        :label="t('paid.continue')"
      />
      <UButton
        v-else-if="view.action === 'retry'"
        :to="localePath('gift-cards')"
        color="neutral"
        :label="t('failed.retry')"
      />
    </section>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Αγορά δωροκάρτας
  gift_cards: Δωροκάρτες
  pending:
    title: Επιβεβαιώνουμε την πληρωμή σου…
    description: Επιβεβαιώνουμε την πληρωμή σου — μην κλείσεις τη σελίδα.
  paid:
    title: Η αγορά ολοκληρώθηκε
    description: Η δωροκάρτα θα σταλεί στον παραλήπτη με email. Η απόδειξή σου έρχεται στο email σου.
    continue: Συνέχεια αγορών
  failed:
    title: Η πληρωμή δεν ολοκληρώθηκε
    description: Η πληρωμή απέτυχε ή ακυρώθηκε — δεν έγινε καμία χρέωση.
    retry: Δοκίμασε ξανά
  processing:
    title: Η πληρωμή επεξεργάζεται
    description: Η επιβεβαίωση αργεί περισσότερο απ' όσο συνήθως. Μόλις ολοκληρωθεί, η δωροκάρτα θα σταλεί αυτόματα και θα λάβεις απόδειξη με email.
en:
  title: Gift card purchase
  gift_cards: Gift cards
  pending:
    title: Confirming your payment…
    description: We are confirming your payment — please do not close this page.
  paid:
    title: Purchase complete
    description: The gift card will be emailed to the recipient. Your receipt is on its way to you.
    continue: Continue shopping
  failed:
    title: The payment did not go through
    description: It failed or was cancelled — nothing was charged.
    retry: Try again
  processing:
    title: Your payment is processing
    description: Confirmation is taking longer than usual. As soon as it clears, the gift card is sent automatically and you get a receipt by email.
</i18n>
