<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  cartItem: { type: Object as PropType<CartItem>, required: true },
})

const cartStore = useCartStore()
const { refreshCart, deleteCartItem } = cartStore

const { t, locale } = useI18n({ useScope: 'local' })
const { contentShorten } = useText()

const { cartItem } = toRefs(props)

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
      bg-primary-100 border-primary-500 relative grid grid-cols-auto-1fr
      items-center justify-center justify-items-center gap-4 rounded-md border

      dark:bg-primary-900 dark:border-primary-500

      md:p-4
    "
  >
    <div class="grid">
      <div class="image">
        <Anchor
          :to="{ path: cartItem.product.absoluteUrl }"
          :title="alt"
        >
          <ImgWithFallback
            loading="lazy"
            class="product-img bg-primary-100"
            :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
            :width="237"
            :height="90"
            fit="contain"
            :background="'transparent'"
            sizes="sm:237px md:109px lg:152px xl:195px xxl:237px 2xl:237px"
            :src="cartItem.product.mainImagePath"
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
          <Anchor
            :to="{ path: cartItem.product.absoluteUrl }"
            :title="alt"
          >
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
            t('remove_from_cart', {
              name: alt,
            })
          "
          type="button"
          @click="deleteCartItemEvent({ cartItemId: cartItem.id })"
        >
          <UIcon name="i-fa6-solid-trash" />
        </button>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  remove_from_cart: Αφαίρεση από το καλάθι {name}
</i18n>
