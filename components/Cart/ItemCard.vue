<script lang="ts" setup>
import type { PropType } from 'vue'

import type { CartItem } from '~/types/cart/cart-item'

const props = defineProps({
  cartItem: { type: Object as PropType<CartItem>, required: true },
})

const cartStore = useCartStore()
const { refreshCart, deleteCartItem } = cartStore

const { locale } = useI18n()
const { contentShorten } = useText()
const { resolveImageSrc } = useImageResolver()

const { cartItem } = toRefs(props)

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
    class="
      bg-primary-100 relative grid grid-cols-auto-1fr items-center
      justify-center justify-items-center gap-4 rounded-md border
      border-gray-900/10 p-2

      dark:bg-primary-900 dark:border-gray-50/[0.2]

      md:p-4
    "
  >
    <div class="grid">
      <div class="image">
        <Anchor :to="`/products${cartItem.product.absoluteUrl}`" :title="alt">
          <ImgWithFallback
            loading="lazy"
            provider="mediaStream"
            class="product-img bg-primary-100"
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
    </div>
    <div
      class="
        grid w-full justify-items-center gap-2

        md:grid-cols-5 md:gap-0
      "
    >
      <div class="title">
        <h3
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <Anchor :to="`/products${cartItem.product.absoluteUrl}`" :title="alt">
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
        <span
          class="
            text-primary-950

            dark:text-primary-50
          "
        >{{
          cartItem.product.finalPrice
        }}</span>
      </div>
      <div class="total-price">
        <span
          class="
            text-primary-950

            dark:text-primary-50
          "
        >{{
          cartItem.totalPrice
        }}</span>
      </div>
      <div
        class="
          remove-from-cart absolute right-2

          md:relative
        "
      >
        <button
          class="
            text-primary-950

            dark:text-primary-50
          "
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
  </div>
</template>
