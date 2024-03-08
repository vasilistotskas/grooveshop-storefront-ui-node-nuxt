<script lang="ts" setup>
import type { PropType } from 'vue'

import type { CartItem } from '~/types/cart/cart-item'

const props = defineProps({
  cartItem: { type: Object as PropType<CartItem>, required: true },
})

const cartStore = useCartStore()
const { fetchCart, deleteCartItem } = cartStore

const { locale } = useI18n()
const { contentShorten } = useText()
const { resolveImageSrc } = useImageResolver()

const { cartItem } = toRefs(props)

const refreshCart = async () => await fetchCart()

const src = computed(() => {
  return resolveImageSrc(
    cartItem?.value?.product?.mainImageFilename,
    `media/uploads/products/${cartItem?.value?.product.mainImageFilename}`,
  )
})

const alt = computed(() => {
  return extractTranslated(cartItem?.value?.product, 'name', locale.value)
})

const cartItemQuantity = useState<number>(
  `${cartItem?.value?.id}-quantity`,
  () => cartItem?.value?.quantity || 0,
)

const deleteCartItemEvent = async ({ cartItemId }: { cartItemId: number }) => {
  await deleteCartItem(cartItemId)
  await refreshCart()
}
</script>

<template>
  <div
    v-if="cartItem"
    class="grid items-center justify-center justify-items-center gap-4 rounded-md border border-gray-900/10 bg-white p-6 dark:border-gray-50/[0.2] dark:bg-zinc-800 md:grid-cols-6 md:p-4"
  >
    <div class="image">
      <Anchor :to="`/product${cartItem.product.absoluteUrl}`" :title="alt">
        <ImgWithFallback
          loading="lazy"
          provider="mediaStream"
          class="product-img bg-white"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :width="237"
          :height="90"
          :fit="'contain'"
          :position="'entropy'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:237px sm:237px md:109px lg:152px xl:195px xxl:237px 2xl:237px`"
          :src="src"
          :alt="alt"
          densities="x1"
        />
      </Anchor>
    </div>
    <div class="title">
      <h3 class="text-primary-700 dark:text-primary-100">
        <Anchor :to="`/product${cartItem.product.absoluteUrl}`" :title="alt">
          {{ contentShorten(alt, 50) }}
        </Anchor>
      </h3>
    </div>
    <div class="quantity">
      <QuantitySelector
        :quantity="cartItemQuantity"
        :max="cartItem.product.stock"
        :cart-item-id="cartItem.id"
      />
    </div>
    <div class="price">
      <span class="text-primary-700 dark:text-primary-100">{{
        cartItem.product.finalPrice
      }}</span>
    </div>
    <div class="total-price">
      <span class="text-primary-700 dark:text-primary-100">{{
        cartItem.totalPrice
      }}</span>
    </div>
    <div class="remove-from-cart">
      <button
        class="text-primary-700 dark:text-primary-100"
        :title="
          $t('components.cart.item_card.remove_from_cart', {
            name: alt,
          })
        "
        type="button"
        @click="deleteCartItemEvent({ cartItemId: cartItem.id })"
      >
        <IconFaSolid:trash />
      </button>
    </div>
  </div>
</template>
