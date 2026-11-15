<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '#ui/types'

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
  // The caller decides how big its own button is: a product card's,
  // the suggestion strip's square one and the sticky bar's differ.
  size: {
    type: String as PropType<ButtonProps['size']>,
    required: false,
    default: 'xl',
  },
  // A short visible label ("Στο καλάθι") when `text`, the accessible
  // name, says more ("Στο καλάθι: <product>"); the name must contain the
  // label (WCAG 2.5.3).
  label: {
    type: String,
    required: false,
    default: undefined,
  },
  // The icon before the label, as the bold product cards draw it; after it
  // everywhere else.
  leadingIcon: {
    type: Boolean,
    required: false,
    default: false,
  },
})

// A browse-only store takes no orders: there is nothing to buy, so no
// buying control renders (every add-to-cart button routes through here).
const cartEnabled = useStoreFeature('cart')
const cartStore = useCartStore()
const { getCartItemByProductId } = cartStore
const { product, quantity, text } = toRefs(props)
const { t, locale } = useStoreI18n('components/variants/webside/Button/Product/AddToCart')
const toast = useToast()

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
const accessibleName = computed(() => {
  if (disabled.value) {
    return t('unavailable')
  }
  return text.value
})
const visibleLabel = computed(() => (disabled.value ? t('unavailable') : props.label ?? text.value))
// A product that cannot be bought looks unavailable wherever the button
// renders (card, buy box, sticky bar): neutral and subtle, never a solid
// fill a phone reads as live, at the disabled opacity. Its label stays
// readable: 4.7:1 in light, 7.3:1 in dark, measured on the page.
const buttonColor = computed<ButtonProps['color']>(() => (disabled.value ? 'neutral' : 'secondary'))
const buttonVariant = computed<ButtonProps['variant']>(() => (disabled.value ? 'subtle' : 'solid'))

const { addToCart } = useAddToCart({
  t,
  productId,
  quantity,
  name: productName,
  // One toast, updated in place, however many times the shopper adds.
  onAdded: () => showOrUpdateToast(toast, CART_ADD_TOAST_ID, {
    title: t('toast.added_title'),
    description: t('toast.added_description', { name: productName.value }),
    color: 'success',
    icon: 'i-heroicons-shopping-cart',
  }),
})
</script>

<template>
  <!-- The theme's accent, solid: the shop's primary action, in the one
       colour the store chose for it. It used to be a pale green `subtle`
       button (2.77:1 on white, under WCAG AA) and an orange one when the
       product could not be bought. A product that cannot be bought gets
       no colour of its own: neutral, subtle, disabled, and it says why. -->
  <UButton
    v-if="cartEnabled && iconOnly"
    icon="i-heroicons-shopping-cart"
    :size="size"
    square
    loading-auto
    :color="buttonColor"
    :variant="buttonVariant"
    :disabled="disabled"
    :aria-label="accessibleName"
    :title="accessibleName"
    @click.prevent="addToCart"
  />
  <UButton
    v-else-if="cartEnabled"
    icon="i-heroicons-shopping-cart"
    :label="visibleLabel"
    :size="size"
    :trailing="!leadingIcon"
    loading-auto
    :color="buttonColor"
    :variant="buttonVariant"
    :disabled="disabled"
    :aria-label="disabled ? t('unavailable') : text"
    :ui="{
      base: 'w-full place-content-center place-items-center',
    }"
    @click.prevent="addToCart"
  />
</template>

<i18n lang="yaml">
el:
  unavailable: Μη διαθέσιμο
  toast:
    adding_title: Προσθήκη στο καλάθι…
    added_title: Προστέθηκε στο καλάθι
    added_description: Το προϊόν "{name}" προστέθηκε στο καλάθι.
    failed_title: Δεν προστέθηκε στο καλάθι
    failed_description: Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.
en:
  unavailable: Unavailable
  toast:
    adding_title: Adding to your basket…
    added_title: Added to your basket
    added_description: '"{name}" was added to your basket.'
    failed_title: Not added to your basket
    failed_description: Something went wrong. Try again in a moment.
</i18n>
