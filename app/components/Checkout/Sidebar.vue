<script lang="ts" setup>
const props = defineProps({
  shippingPrice: { type: Number, required: true },
})

const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const payWay = useState<PayWay | null>('selectedPayWay')
const { t, n } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const payWayCost = computed(() => {
  if (!payWay?.value?.freeForOrderAmount) return 0
  const cartTotal = cart.value?.totalPrice || 0
  return cartTotal >= payWay?.value?.freeForOrderAmount
    ? 0
    : payWay?.value?.cost
})

const checkoutTotal = computed(() => {
  if (!cart.value) return 0
  return cart.value.totalPrice + props.shippingPrice + payWayCost.value
})

defineSlots<{
  'pay-ways'(props: object): any
  'items'(props: object): any
  'button'(props: object): any
}>()
</script>

<template>
  <aside id="checkout-sidebar" class="checkout-sidebar">
    <UCard class="w-full">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-primary-950 dark:text-primary-50">
            {{ t('title') }}
          </h3>
          <UButton
            :to="localePath('cart')"
            color="neutral"
            variant="link"
            size="sm"
            icon="i-heroicons-chevron-left"
          >
            {{ t('back_to_cart') }}
          </UButton>
        </div>
      </template>

      <!-- Delivery Information -->
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <UIcon name="i-heroicons-truck" class="size-8 text-primary-600 dark:text-primary-400" />
          <div class="w-full space-y-1">
            <p class="text-sm text-primary-600 dark:text-primary-400">
              {{ t('delivery_estimation') }}
            </p>
            <p class="text-sm text-primary-950 dark:text-primary-50">
              {{ t('shipping_address') }}
            </p>
          </div>
        </div>

        <!-- Order Items -->
        <div class="border-t border-primary-200 dark:border-primary-800 pt-4">
          <slot name="items" />
        </div>

        <!-- Order Summary -->
        <div class="space-y-3 border-t border-primary-200 dark:border-primary-800 pt-4">
          <div class="flex justify-between items-center">
            <span class="text-primary-950 dark:text-primary-50">{{ t('items_unique') }}</span>
            <ClientOnly>
              <span class="text-primary-950 dark:text-primary-50 font-bold">{{ cart?.totalItemsUnique }}</span>
              <template #fallback>
                <USkeleton class="h-5 w-6" />
              </template>
            </ClientOnly>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-primary-950 dark:text-primary-50">{{ t('shipping') }}</span>
            <span class="text-primary-950 dark:text-primary-50 font-bold">{{ n(shippingPrice, 'currency') }}</span>
          </div>
          <div v-if="payWayCost" class="flex justify-between items-center">
            <span class="text-primary-950 dark:text-primary-50">{{ t('pay_way_fee') }}</span>
            <span class="text-primary-950 dark:text-primary-50 font-bold">{{ n(payWayCost, 'currency') }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="flex justify-between items-center border-t border-primary-200 dark:border-primary-800 pt-4">
          <span class="text-lg font-bold text-primary-950 dark:text-primary-50">{{ t('total') }}</span>
          <ClientOnly>
            <span class="text-xl font-bold text-primary-600 dark:text-primary-400">{{ n(checkoutTotal, 'currency') }}</span>
            <template #fallback>
              <USkeleton class="h-5 w-16" />
            </template>
          </ClientOnly>
        </div>

        <!-- VAT Info -->
        <div class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
          <UIcon name="i-heroicons-shield-check" />
          <span>{{ t('vat_included') }}</span>
        </div>
      </div>

      <template #footer>
        <div class="space-y-4">
          <!-- Payment Button -->
          <slot name="button" />

          <!-- Help Section -->
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-question-mark-circle"
            block
          >
            {{ t('need_help') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </aside>
</template>

<i18n lang="yaml">
el:
  title: Ολοκλήρωση αγοράς
  items_unique: Είδη
  shipping: Αποστολή
  total: Σύνολο
  pay_way_fee: Προμήθεια Τρόπου πληρωμής
  delivery_estimation: Παράδοση έως Τετ, 09 Απρ
  shipping_address: Ηρούς 4, Αθήνα
  back_to_cart: Επιστροφή στο καλάθι
  vat_included: Στις τιμές συμπεριλαμβάνεται Φ.Π.Α.
  need_help: Χρειάζεσαι βοήθεια;
</i18n>
