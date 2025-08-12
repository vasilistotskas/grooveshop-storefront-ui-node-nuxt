<script lang="ts" setup>
const props = defineProps({
  shippingPrice: { type: Number, required: true },
})

const { $i18n } = useNuxtApp()
const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const payWay = useState<PayWay | null>('selectedPayWay')
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const payWayCost = computed(() => {
  if (!payWay?.value || typeof payWay.value === 'number') return 0
  const cartTotal = cart.value?.totalPrice || 0
  return cartTotal >= 0 // Fallback since freeForOrderAmount doesn't exist in new schema
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

        <div class="border-t border-primary-200 dark:border-primary-800 pt-4">
          <slot name="items" />
        </div>

        <div class="space-y-3 border-t border-primary-200 dark:border-primary-800 pt-4">
          <div class="flex justify-between items-center">
            <span class="text-primary-950 dark:text-primary-50">{{ t('items_unique') }}</span>
            <span class="text-primary-950 dark:text-primary-50 font-bold">{{ cart?.totalItemsUnique }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-primary-950 dark:text-primary-50">{{ t('shipping') }}</span>
            <span class="text-primary-950 dark:text-primary-50 font-bold">{{ $i18n.n(shippingPrice, 'currency') }}</span>
          </div>
          <div v-if="payWayCost" class="flex justify-between items-center">
            <span class="text-primary-950 dark:text-primary-50">{{ t('pay_way_fee') }}</span>
            <span class="text-primary-950 dark:text-primary-50 font-bold">{{ $i18n.n(payWayCost, 'currency') }}</span>
          </div>
        </div>

        <div class="flex justify-between items-center border-t border-primary-200 dark:border-primary-800 pt-4">
          <span class="text-lg font-bold text-primary-950 dark:text-primary-50">{{ t('total') }}</span>
          <span class="text-xl font-bold text-primary-600 dark:text-primary-400">{{ $i18n.n(checkoutTotal, 'currency') }}</span>
        </div>

        <div class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
          <UIcon name="i-heroicons-shield-check" class="text-green-500 size-6" />
          <span>{{ t('vat_included') }}</span>
        </div>
      </div>

      <template #footer>
        <div class="space-y-4">
          <slot name="button" />

          <UButton
            color="info"
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
