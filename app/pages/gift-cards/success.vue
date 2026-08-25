<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

defineRouteRules({
  robots: false,
})

definePageMeta({
  middleware: ['gift-cards-enabled'],
})

useSeoMeta({
  title: () => t('title'),
})

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
    const response = await $fetch<{ purchaseUuid: string, status: string }>(
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
</script>

<template>
  <PageWrapper class="flex flex-col gap-6">
    <PageTitle :text="t('title')" />

    <div class="mx-auto w-full max-w-xl">
      <UCard>
        <!-- Paid -->
        <div
          v-if="status === 'PAID'"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="mx-auto size-12 text-success"
          />
          <h2 class="text-xl font-semibold">
            {{ t('paid.title') }}
          </h2>
          <p class="text-muted">
            {{ t('paid.description') }}
          </p>
        </div>

        <!-- Failed / canceled -->
        <div
          v-else-if="status === 'FAILED' || status === 'CANCELED' || status === 'UNKNOWN'"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-x-circle"
            class="mx-auto size-12 text-error"
          />
          <h2 class="text-xl font-semibold">
            {{ t('failed.title') }}
          </h2>
          <p class="text-muted">
            {{ t('failed.description') }}
          </p>
          <UButton
            :to="localePath('gift-cards')"
            color="secondary"
            variant="solid"
          >
            {{ t('failed.retry') }}
          </UButton>
        </div>

        <!-- Still pending after the poll budget -->
        <div
          v-else-if="timedOut"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-clock"
            class="mx-auto size-12 text-warning"
          />
          <h2 class="text-xl font-semibold">
            {{ t('processing.title') }}
          </h2>
          <p class="text-muted">
            {{ t('processing.description') }}
          </p>
        </div>

        <!-- Polling -->
        <div
          v-else
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-arrow-path"
            class="mx-auto size-12 animate-spin text-muted"
          />
          <h2 class="text-xl font-semibold">
            {{ t('pending.title') }}
          </h2>
          <p class="text-muted">
            {{ t('pending.description') }}
          </p>
        </div>
      </UCard>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αγορά δωροκάρτας
  pending:
    title: Επιβεβαίωση πληρωμής…
    description: Επιβεβαιώνουμε την πληρωμή σας — μην κλείσετε τη σελίδα
  paid:
    title: Η αγορά ολοκληρώθηκε!
    description: Η δωροκάρτα θα σταλεί στον παραλήπτη με email. Θα λάβετε απόδειξη αγοράς στο email σας.
  failed:
    title: Η πληρωμή δεν ολοκληρώθηκε
    description: Η πληρωμή απέτυχε ή ακυρώθηκε — δεν έγινε καμία χρέωση
    retry: Δοκιμάστε ξανά
  processing:
    title: Η πληρωμή επεξεργάζεται
    description: Η επιβεβαίωση αργεί περισσότερο από το συνηθισμένο. Μόλις ολοκληρωθεί, η δωροκάρτα θα σταλεί αυτόματα και θα λάβετε απόδειξη με email.
</i18n>
