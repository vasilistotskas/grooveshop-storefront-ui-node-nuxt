<script lang="ts" setup>
import type { PayWay } from '~/types/pay-way'

const props = defineProps({
  shippingPrice: { type: Number, required: true },
})

const cartStore = useCartStore()
const { cart, getCartItems } = storeToRefs(cartStore)
const payWay = useState<PayWay | null>('selectedPayWay')

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
            {{ $t('components.checkout.sidebar.title') }}
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
                {{ $t('components.checkout.sidebar.items_unique') }}:
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
                {{ $t('components.checkout.sidebar.shipping') }}:
              </span>
            </div>
            <div class="grid">
              <I18nN
                tag="span"
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
                format="currency"
                :value="shippingPrice"
              />
            </div>
          </div>
          <div v-if="payWayCost" class="flex gap-1">
            <div class="grid">
              <span
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('components.checkout.sidebar.pay_way_fee') }}:
              </span>
            </div>
            <div class="grid">
              <I18nN
                tag="span"
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
                format="currency"
                :value="payWayCost"
              />
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
                {{ $t('components.checkout.sidebar.total') }}:
              </span>
            </div>
            <div class="grid">
              <I18nN
                tag="span"
                class="
                  text-primary-950 font-bold

                  dark:text-primary-50
                "
                format="currency"
                :value="checkoutTotal"
              />
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
