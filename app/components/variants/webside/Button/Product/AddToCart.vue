<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  product: { type: Object as PropType<Product | ProductCard>, required: true },
  quantity: { type: Number, required: false, default: 1 },
  text: {
    type: String,
    required: true,
  },
  // A square icon button with ``text`` as its accessible name — the
  // compact card in the suggestion strip, where a full-width labelled
  // button would crowd the tile. Same logic, toasts and disabled rules.
  iconOnly: {
    type: Boolean,
    required: false,
    default: false,
  },
})

// A browse-only store takes no orders: there is nothing to buy, so no
// buying control renders (every add-to-cart button routes through here).
const cartEnabled = useStoreFeature('cart')
const cartStore = useCartStore()
const { createCartItem, updateCartItem, getCartItemByProductId } = cartStore
const { error } = storeToRefs(cartStore)
const { product, quantity, text } = toRefs(props)
const { t, locale } = useStoreI18n('components/variants/webside/Button/Product/AddToCart')
const toast = useToast()
const { notify } = useApiError()

const productName = computed(() => {
  if ('name' in product.value && typeof product.value.name === 'string') {
    return product.value.name
  }
  return extractTranslated(product.value, 'name', locale.value)
})

// Get the correct product ID for URLs and API calls
// For search results (ProductMeiliSearchResult), use 'master' field
// For regular Product objects, use 'id' field
const productId = computed(() => {
  if ('master' in product.value && typeof product.value.master === 'number') {
    return product.value.master
  }
  return product.value.id
})

const cartItem = computed(() => {
  return getCartItemByProductId(productId.value)
})
const disabled = computed(() => {
  if (product.value.active === false) {
    return true
  }
  if (product.value.stock === 0 || (product.value.stock && quantity.value > product.value.stock)) {
    return true
  }
  if (cartItem.value && cartItem.value.quantity && product.value.stock && cartItem.value.quantity + quantity.value > product.value.stock) {
    return true
  }
  return false
})
const label = computed(() => {
  if (disabled.value) {
    return t('unavailable')
  }
  return text.value
})

const addToCartEvent = async () => {
  const existingCartItem = getCartItemByProductId(productId.value)
  let failed = false

  try {
    if (existingCartItem) {
      await updateCartItem(existingCartItem.id, {
        quantity: (existingCartItem.quantity || 0) + quantity.value,
      })
    }
    else {
      await createCartItem({
        product: productId.value,
        quantity: quantity.value,
      })
    }
  }
  catch {
    failed = true
  }

  if (failed) {
    notify('webside-cart:add', error.value, { title: t('toast.failed_title'), fallback: t('toast.failed_description') })
    return
  }

  // One toast, updated in place, however many times the shopper adds.
  showOrUpdateToast(toast, ADDED_TO_CART_TOAST_ID, {
    title: t('toast.added_title'),
    description: t('toast.added_description', { name: productName.value }),
    color: 'success',
    icon: 'i-heroicons-shopping-cart',
  })
}
</script>

<template>
  <UButton
    v-if="cartEnabled && iconOnly"
    icon="i-heroicons-shopping-cart"
    size="lg"
    square
    :color="disabled ? 'warning' : 'success'"
    variant="solid"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click.prevent="addToCartEvent"
  />
  <UButton
    v-else-if="cartEnabled"
    icon="i-heroicons-shopping-cart"
    :label="label"
    size="xl"
    :trailing="true"
    :color="disabled ? 'warning' : 'success'"
    variant="subtle"
    :disabled="disabled"
    :aria-label="disabled ? t('unavailable') : text"
    :ui="{
      base: 'w-full place-content-center place-items-center',
    }"
    @click.prevent="addToCartEvent"
  />
</template>

<i18n lang="yaml">
el:
  unavailable: Μή Διαθέσιμο
  toast:
    added_title: Προστέθηκε στο καλάθι
    added_description: Το προϊόν "{name}" προστέθηκε στο καλάθι.
    failed_title: Δεν προστέθηκε στο καλάθι
    failed_description: Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.
en:
  unavailable: Unavailable
  toast:
    added_title: Added to your basket
    added_description: '"{name}" was added to your basket.'
    failed_title: Not added to your basket
    failed_description: Something went wrong. Try again in a moment.
</i18n>
