<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '#ui/types'

const props = defineProps({
  product: { type: Object as PropType<Product>, required: true },
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
  // The caller decides how big its own CTA is — a sticky bar's button
  // and a product page's are not the same size, and the component used
  // to hardcode `xl` and ignore what it was told.
  size: {
    type: String as PropType<ButtonProps['size']>,
    required: false,
    default: 'lg',
  },
})

const cartStore = useCartStore()
const { createCartItem, updateCartItem, getCartItemByProductId } = cartStore
const { error } = storeToRefs(cartStore)
const { product, quantity, text } = toRefs(props)
const { t, locale } = useI18n()
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

  // Forwarded upstream bodies sit at .data; the legacy thrown-error
  // wrapper nested them at .data.data — accept both.
  const rawData = error.value?.data as Record<string, unknown> | undefined
  const errorData = (rawData?.nonFieldErrors ? rawData : rawData?.data) as Record<string, unknown> | undefined
  const nonFieldErrors = errorData?.nonFieldErrors as string[] | undefined
  if (nonFieldErrors && nonFieldErrors.length > 0) {
    nonFieldErrors.forEach((error: string) => {
      toast.add({
        title: error,
        color: 'error',
      })
    })
    return
  }

  if (failed) return

  toast.add({
    title: t('toast.added_title'),
    description: t('toast.added_description', { name: productName.value }),
    color: 'success',
    icon: 'i-heroicons-shopping-cart',
  })
}
</script>

<template>
  <!-- The store's accent, solid: this is the shop's primary action.
       It used to be `success` in a `subtle` variant — a pale green that
       reads as "that worked", not "buy this", and the same colour the
       toast uses to confirm it afterwards. -->
  <UButton
    v-if="iconOnly"
    icon="i-heroicons-shopping-cart"
    :size="size"
    square
    color="secondary"
    variant="solid"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click.prevent="addToCartEvent"
  />
  <UButton
    v-else
    icon="i-heroicons-shopping-cart"
    :label="label"
    :size="size"
    trailing
    color="secondary"
    variant="solid"
    :disabled="disabled"
    :aria-label="disabled ? t('unavailable') : text"
    :ui="{ base: 'w-full place-content-center place-items-center' }"
    @click.prevent="addToCartEvent"
  />
</template>

<i18n lang="yaml">
el:
  unavailable: Μή Διαθέσιμο
  toast:
    added_title: Προστέθηκε στο καλάθι
    added_description: Το προϊόν "{name}" προστέθηκε στο καλάθι.
en:
  unavailable: Unavailable
  toast:
    added_title: Added to your basket
    added_description: '"{name}" was added to your basket.'
</i18n>
