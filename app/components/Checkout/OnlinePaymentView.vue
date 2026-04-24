<script lang="ts" setup>
defineProps<{
  createdOrder: OrderDetail
  selectedPayWay: PayWay
  isStripePayment: boolean
  isVivaWalletPayment: boolean
  useHostedCheckout: boolean
}>()

// Persist Stripe clientSecret across re-mounts to avoid orphan payment intents
const stripeClientSecret = ref<string | null>(null)

const emit = defineEmits<{
  'payment-success': []
  'payment-error': [error: string]
  'back-to-form': []
}>()

const { t } = useI18n()
const toast = useToast()

const onRedirecting = () => {
  toast.add({ title: t('redirecting'), color: 'info' })
}
</script>

<template>
  <UCard variant="soft">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">
            {{ t('complete_payment') }}
          </h2>
          <p class="text-sm text-primary-950 dark:text-primary-50">
            {{ t('order_created_complete_payment') }}
          </p>
        </div>
        <UButton
          variant="ghost"
          icon="i-heroicons-arrow-left"
          size="sm"
          @click="emit('back-to-form')"
        >
          {{ t('back_to_form') }}
        </UButton>
      </div>
    </template>

    <div class="space-y-6">
      <div class="rounded-lg bg-elevated/70 p-4">
        <h3 class="mb-2 font-medium">
          {{ t('order_summary') }}
        </h3>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span>{{ t('order_number') }}:</span>
            <span class="font-medium">#{{ createdOrder?.id }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('total_amount') }}:</span>
            <span class="font-medium">
              {{ createdOrder?.pricingBreakdown?.grandTotal }}
              {{ createdOrder?.pricingBreakdown?.currency }}
            </span>
          </div>
        </div>
      </div>

      <!-- Viva Wallet Hosted Checkout -->
      <VivaWalletCheckout
        v-if="isVivaWalletPayment"
        :order="createdOrder"
        :pay-way="selectedPayWay"
        @error="(error: string) => emit('payment-error', error)"
        @redirecting="onRedirecting"
      />

      <!-- Stripe Hosted Checkout -->
      <StripeCheckout
        v-else-if="isStripePayment && useHostedCheckout"
        :order="createdOrder"
        :pay-way="selectedPayWay"
        @error="(error: string) => emit('payment-error', error)"
        @redirecting="onRedirecting"
      />

      <!-- Stripe Embedded Payment -->
      <StripePayment
        v-else-if="isStripePayment"
        :order="createdOrder"
        :pay-way="selectedPayWay"
        :initial-client-secret="stripeClientSecret"
        @success="emit('payment-success')"
        @error="(error: string) => emit('payment-error', error)"
        @update:client-secret="(val) => stripeClientSecret = val"
      />
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  complete_payment: Ολοκλήρωση Πληρωμής
  order_created_complete_payment: Η παραγγελία δημιουργήθηκε. Ολοκλήρωσε την πληρωμή για να ολοκληρώσεις την παραγγελία.
  back_to_form: Επιστροφή
  order_summary: Σύνοψη Παραγγελίας
  order_number: Αριθμός παραγγελίας
  total_amount: Συνολικό ποσό
  redirecting: Μεταφορά στην σελίδα πληρωμής
</i18n>
