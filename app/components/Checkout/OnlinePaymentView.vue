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
const headingId = useId()

const onRedirecting = () => {
  toast.add({ title: t('redirecting'), color: 'info' })
}
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h2
          :id="headingId"
          class="font-display text-2xl font-bold text-highlighted"
        >
          {{ t('complete_payment') }}
        </h2>
        <p class="text-sm text-toned">
          {{ t('order_created_complete_payment') }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-left"
        size="sm"
        @click="() => { emit('back-to-form') }"
      >
        {{ t('back_to_form') }}
      </UButton>
    </div>

    <dl class="flex flex-col gap-1.5 rounded-xl bg-elevated p-4 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-toned">
          {{ t('order_number') }}
        </dt>
        <dd class="font-mono font-semibold text-highlighted">
          #{{ createdOrder?.id }}
        </dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-toned">
          {{ t('total_amount') }}
        </dt>
        <dd class="font-mono font-semibold text-highlighted">
          {{ createdOrder?.pricingBreakdown?.grandTotal }}
          {{ createdOrder?.pricingBreakdown?.currency }}
        </dd>
      </div>
    </dl>

    <!-- Viva Wallet Hosted Checkout -->
    <VivaWalletCheckout
      v-if="isVivaWalletPayment"
      :order="createdOrder"
      :pay-way="selectedPayWay"
      @error="(error: string) => emit('payment-error', error)"
      @redirecting="onRedirecting"
    />

    <!-- Stripe Hosted Checkout -->
    <ClientOnly v-else-if="isStripePayment && useHostedCheckout">
      <StripeCheckout
        :order="createdOrder"
        :pay-way="selectedPayWay"
        @error="(error: string) => emit('payment-error', error)"
        @redirecting="onRedirecting"
      />
    </ClientOnly>

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
  </section>
</template>

<i18n lang="yaml">
el:
  complete_payment: Ολοκλήρωση πληρωμής
  order_created_complete_payment: Η παραγγελία δημιουργήθηκε. Ολοκλήρωσε την πληρωμή για να ολοκληρώσεις την παραγγελία.
  back_to_form: Επιστροφή
  order_number: Αριθμός παραγγελίας
  total_amount: Συνολικό ποσό
  redirecting: Μεταφορά στην σελίδα πληρωμής
en:
  complete_payment: Complete payment
  order_created_complete_payment: Your order was created. Complete the payment to finish it.
  back_to_form: Back
  order_number: Order number
  total_amount: Total
  redirecting: Taking you to the payment page
</i18n>
