<script setup lang="ts">
interface Props {
  order: OrderDetail
  payWay: PayWay
}

const props = defineProps<Props>()

const emit = defineEmits<{
  error: [error: string]
  redirecting: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const processing = ref(false)
const error = ref('')

const createCheckoutSession = async () => {
  if (processing.value) return

  processing.value = true
  error.value = ''

  try {
    const baseUrl = window.location.origin
    const successUrl = `${baseUrl}${localePath({
      name: 'checkout-success-uuid',
      params: { uuid: props.order.uuid },
    })}?session_id={CHECKOUT_SESSION_ID}`

    const cancelUrl = `${baseUrl}${localePath({
      name: 'checkout',
    })}?canceled=true`

    const response = await $fetch(
      `/api/orders/${props.order.id}/create-checkout-session`,
      {
        method: 'POST',
        headers: useRequestHeaders(),
        body: {
          successUrl: successUrl,
          cancelUrl: cancelUrl,
          customerEmail: props.order.email,
          description: `Payment for Order #${props.order.id}`,
        },
      },
    )

    if (!response || !response.checkoutUrl) {
      throw new Error('Invalid response from server')
    }

    emit('redirecting')

    window.location.href = response.checkoutUrl
  }
  catch (err: any) {
    console.error('Checkout session creation error:', err)
    error.value = err.data?.detail || t('checkout_session_error')
    emit('error', error.value)
  }
  finally {
    processing.value = false
  }
}

onMounted(() => {
  createCheckoutSession()
})
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="processing"
      class="
        flex flex-col items-center justify-center space-y-4 rounded-lg
        bg-primary-100 p-8
        dark:bg-primary-900
      "
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="h-12 w-12 animate-spin text-primary"
      />
      <div class="text-center">
        <h3 class="mb-2 text-lg font-semibold">
          {{ t('redirecting_to_checkout') }}
        </h3>
        <p
          class="
            text-sm text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('please_wait') }}
        </p>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      :title="t('checkout_error')"
      :description="error"
      :close="{ color: 'error', variant: 'link' }"
      @update:open="error = ''"
    />

    <div
      v-if="!processing && error"
      class="mt-4"
    >
      <UButton
        :loading="processing"
        block
        size="lg"
        icon="i-heroicons-arrow-path"
        @click="createCheckoutSession"
      >
        {{ t('retry') }}
      </UButton>
    </div>

    <div
      class="
        flex items-start gap-2 rounded-lg bg-primary-100 p-3 text-xs
        text-primary-950
        dark:bg-primary-900 dark:text-primary-50
      "
    >
      <UIcon name="i-heroicons-shield-check" class="mt-0.5 h-4 w-4 shrink-0" />
      <p>{{ t('secure_redirect_notice') }}</p>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  redirecting_to_checkout: Μεταφορά στην σελίδα πληρωμής
  please_wait: Παρακαλώ περίμενε...
  checkout_error: Σφάλμα Checkout
  checkout_session_error: Αποτυχία δημιουργίας συνεδρίας πληρωμής
  retry: Επανάληψη
  secure_redirect_notice: Θα μεταφερθείς στην ασφαλή σελίδα πληρωμής της Stripe. Μην κλείσεις αυτό το παράθυρο.
</i18n>
