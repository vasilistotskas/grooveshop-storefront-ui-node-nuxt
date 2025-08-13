<script lang="ts" setup>
import type { PropType } from 'vue'

const { productUrl } = useUrls()

const props = defineProps({
  cartItem: { type: Object as PropType<CartItem>, required: true },
})

const { $i18n } = useNuxtApp()
const { isMobileOrTablet } = useDevice()
const cartStore = useCartStore()
const { refreshCart, deleteCartItem } = cartStore

const { t } = useI18n({ useScope: 'local' })
const { contentShorten } = useText()

const { cartItem } = toRefs(props)

const alt = computed(() => {
  return `Product ${cartItem?.value?.product}`
})

const cartItemQuantity = useState<number>(
  `${cartItem?.value?.id}-quantity`,
  () => cartItem?.value?.quantity || 0,
)

const deleteCartItemEvent = async ({ cartItemId }: { cartItemId: number }) => {
  await deleteCartItem(cartItemId)
  await refreshCart()
}

const formattedPrice = computed(() => {
  return cartItem.value?.finalPrice ? $i18n.n(cartItem.value.finalPrice, 'currency') : '-'
})

const formattedTotal = computed(() => {
  return cartItem.value?.totalPrice ? $i18n.n(cartItem.value.totalPrice, 'currency') : '-'
})
</script>

<template>
  <div
    v-if="cartItem"
    class="flex flex-col sm:flex-row gap-4 sm:gap-6"
  >
    <div class="relative h-24 w-full sm:w-24 flex-shrink-0 overflow-hidden rounded-lg">
      <Anchor
        :to="{ path: productUrl(typeof cartItem.product === 'number' ? cartItem.product : cartItem.product.id) }"
        :title="alt"
      >
        <ImgWithFallback
          loading="lazy"
          class="h-full w-full object-contain bg-neutral-900 dark:bg-neutral-50"
          :width="96"
          :height="96"
          fit="contain"
          :background="'transparent'"
          :src="cartItem.product.mainImagePath"
          :alt="alt"
          densities="x1"
        />
      </Anchor>
    </div>

    <div class="flex flex-1 flex-col">
      <div class="relative flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
        <div>
          <h3 class="text-base font-medium">
            <Anchor
              :to="{ path: productUrl(typeof cartItem.product === 'number' ? cartItem.product : cartItem.product.id) }"
              :title="alt"
            >
              {{ contentShorten(alt, 50) }}
            </Anchor>
          </h3>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{{ t('price') }}: {{ formattedPrice }}</span>
            <span
              v-if="cartItem.discountValue"
              class="text-green-600"
            >
              ({{ t('save') }} {{ $i18n.n(cartItem.discountValue, 'currency') }})
            </span>
          </div>
        </div>

        <UButton
          :class="isMobileOrTablet ? 'absolute right-0 top-0' : ''"
          color="error"
          variant="link"
          icon="i-fa6-solid-trash"
          size="sm"
          :title="t('remove_from_cart', { name: alt })"
          @click="deleteCartItemEvent({ cartItemId: cartItem.id })"
        />
      </div>

      <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div class="w-full sm:w-32">
          <QuantitySelector
            :quantity="cartItemQuantity"
            :max="cartItem.product.stock"
            :cart-item-id="cartItem.id"
          />
        </div>
        <p class="text-sm font-medium">
          {{ t('total') }}: {{ formattedTotal }}
        </p>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  remove_from_cart: Αφαίρεση από το καλάθι {name}
  price: Τιμή
  save: Έκπτωση
  total: Σύνολο
</i18n>
