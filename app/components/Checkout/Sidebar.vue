<script lang="ts" setup>
const props = defineProps({
  shippingPrice: { type: Number, required: true },
})

const cartStore = useCartStore()
const { cart, getCartItems } = storeToRefs(cartStore)
const payWay = useState<PayWay | null>('selectedPayWay')
const { t, n } = useI18n({ useScope: 'local' })

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
  <div class="grid-rows-auto relative grid gap-2">
    <slot name="pay-ways" />
    <slot name="items" />
    <ClientOnly>
      <div class="grid">
        <div class="sr-only">
          <h3
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ t('title') }}
          </h3>
        </div>
        <div v-if="cart && getCartItems?.length">
          <div class="flex gap-1">
            <div class="grid">
              <span
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ t('items_unique') }}:
              </span>
            </div>
            <div class="grid">
              <span
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
              >
                {{ cart.totalItemsUnique }}
              </span>
            </div>
          </div>
          <div class="flex gap-1">
            <div class="grid">
              <span
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ t('shipping') }}:
              </span>
            </div>
            <div class="grid">
              <span
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
              >
                {{ n(shippingPrice, 'currency') }}
              </span>
            </div>
          </div>
          <div
            v-if="payWayCost"
            class="flex gap-1"
          >
            <div class="grid">
              <span
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ t('pay_way_fee') }}:
              </span>
            </div>
            <div class="grid">
              <span
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
              >
                {{ n(payWayCost, 'currency') }}
              </span>
            </div>
          </div>
          <div class="flex gap-1">
            <div class="grid">
              <span
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ t('total') }}:
              </span>
            </div>
            <div class="grid">
              <span
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
              >
                {{ n(checkoutTotal, 'currency') }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <template #fallback>
        <ClientOnlyFallback height="72px" />
      </template>
    </ClientOnly>
    <slot name="button" />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Ολοκλήρωση αγοράς
  items_unique: Είδη
  shipping: Αποστολή
  total: Σύνολο
  pay_way_fee: Προμήθεια Τρόπου πληρωμής
</i18n>
