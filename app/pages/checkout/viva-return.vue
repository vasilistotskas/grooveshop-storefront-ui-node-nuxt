<script lang="ts" setup>
// Viva Wallet hosted-checkout callback. The merchant portal's source
// success URL must be set to ``https://webside.gr/{locale}/checkout/viva-return``
// because Viva's ``POST /checkout/v2/orders`` only accepts a per-order
// ``urlFail`` — there is no per-order success URL field. After payment
// Viva appends ``?t=<transaction_id>&s=<F|...>&eventId=<merchantTrns>&lang=...``
// and we translate the transaction_id into the order's UUID via the
// ``/api/checkout/viva-return`` proxy, then forward to the canonical
// success page (which already knows how to render Viva-paid orders —
// it watches ``route.query.s``).
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const transactionId = computed(() => {
  const raw = route.query.t
  return typeof raw === 'string' && raw ? raw : ''
})

// ``eventId`` echoes the ``merchantTrns`` we sent to Viva at
// session creation. The Django backend sets it to ``order.uuid`` so
// the return lookup can succeed even before the webhook has set
// ``payment_id`` on the row (race window: customer browser redirect
// vs. Viva server → our webhook can lag by tens of seconds).
const eventId = computed(() => {
  const raw = route.query.eventId
  return typeof raw === 'string' && raw ? raw : ''
})

const vivaStatus = computed(() => {
  const raw = route.query.s
  return typeof raw === 'string' ? raw : ''
})

const isFailure = computed(() => {
  // Per Viva docs: ``s=F`` is the success status code (PAYMENT
  // SUCCESSFUL). Anything else (X, R, etc.) is a non-success state.
  // An empty ``s`` is treated as failure so we don't optimistically
  // forward when Viva didn't include the status param.
  return vivaStatus.value !== '' && vivaStatus.value !== 'F'
})

const errorMessage = ref('')

onMounted(async () => {
  if (!transactionId.value && !eventId.value) {
    errorMessage.value = t('error.missing_transaction_id')
    return
  }

  if (isFailure.value) {
    // Forward the customer back to the checkout step with a flag so
    // the page can surface a toast — order is still PENDING server-
    // side, the abandoned-cart sweeper will clean up.
    log.warn('checkout/viva-return', 'non-success status', {
      status: vivaStatus.value,
      transactionId: transactionId.value,
    })
    await navigateTo(`${localePath('checkout')}?canceled=true`)
    return
  }

  try {
    const data = await $fetch<{
      id: number
      uuid: string
      status: string
      paymentStatus: string
    }>('/api/checkout/viva-return', {
      query: { t: transactionId.value, eventId: eventId.value },
    })

    if (!data?.uuid) {
      throw new Error('Order lookup returned no UUID')
    }

    log.info('checkout/viva-return', 'forwarding to success', {
      orderId: data.id,
      uuid: data.uuid,
      paymentStatus: data.paymentStatus,
    })

    // Forward Viva's ``s`` param through so the success page's
    // ``fromViva`` computed kicks in and triggers its existing
    // payment-status polling loop.
    await navigateTo(
      `${localePath({
        name: 'checkout-success-uuid',
        params: { uuid: data.uuid },
      })}?s=${encodeURIComponent(vivaStatus.value || 'F')}&uuid=${data.uuid}`,
    )
  }
  catch (err) {
    log.error({ action: 'checkout/viva-return:lookup', error: err })
    errorMessage.value = t('error.lookup_failed')
  }
})
</script>

<template>
  <div class="mx-auto max-w-md py-16 text-center">
    <template v-if="!errorMessage">
      <UIcon
        name="i-heroicons-arrow-path"
        class="mx-auto mb-4 h-12 w-12 animate-spin text-primary"
      />
      <h1 class="text-xl font-semibold">
        {{ t('processing') }}
      </h1>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        {{ t('please_wait') }}
      </p>
    </template>

    <template v-else>
      <UIcon
        name="i-heroicons-exclamation-circle"
        class="mx-auto mb-4 h-12 w-12 text-error"
      />
      <h1 class="text-xl font-semibold">
        {{ t('error.title') }}
      </h1>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        {{ errorMessage }}
      </p>
      <UButton
        :to="localePath('checkout')"
        class="mt-6"
        color="primary"
        size="lg"
      >
        {{ t('back_to_checkout') }}
      </UButton>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  processing: Επαλήθευση πληρωμής…
  please_wait: Παρακαλώ περίμενε, σε λίγο θα μεταφερθείς στην επιβεβαίωση της παραγγελίας σου.
  back_to_checkout: Επιστροφή στην πληρωμή
  error:
    title: Σφάλμα επαλήθευσης
    missing_transaction_id: Δεν βρέθηκε αναγνωριστικό συναλλαγής στο URL.
    lookup_failed: Δεν μπορέσαμε να εντοπίσουμε την παραγγελία σου. Έλεγξε την σελίδα παραγγελιών σου ή επικοινώνησε με την υποστήριξη.
</i18n>
