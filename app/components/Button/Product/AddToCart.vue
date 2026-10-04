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
  // How the button looks where it is placed. The product page's CTA is
  // the store's accent across the buy box; a product card's is an ink
  // "Add" pill on the photograph. Same logic, toasts and disabled rules.
  color: {
    type: String as PropType<ButtonProps['color']>,
    required: false,
    default: 'secondary',
  },
  icon: {
    type: String,
    required: false,
    default: 'i-heroicons-shopping-cart',
  },
  // Whether the labelled button fills its container.
  block: {
    type: Boolean,
    required: false,
    default: true,
  },
  // A short visible label ("Add") when `text`, the accessible name,
  // would not fit; the name must contain the label (WCAG 2.5.3).
  label: {
    type: String,
    required: false,
    default: undefined,
  },
})

const cartStore = useCartStore()
const { createCartItem, updateCartItem, getCartItemByProductId } = cartStore
const { error } = storeToRefs(cartStore)
const { product, quantity, text } = toRefs(props)
const { t, locale } = useI18n()
const toast = useToast()
const drawer = useCartDrawer()
const img = useMediaStreamImage()

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
const visibleLabel = computed(() => {
  if (disabled.value) {
    return t('unavailable')
  }
  return props.label ?? text.value
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

  // A swallowed failure is worse than an error: the shopper clicks
  // Buy, the cart badge does not move, and nothing at all says why.
  // Measured on staging — an add that never reached the API produced
  // no toast, no console error and no cart change. The store's own
  // messages are surfaced above; this is the fallback for everything
  // else, including a network that simply was not there.
  if (failed) {
    toast.add({
      title: t('toast.failed_title'),
      description: t('toast.failed_description'),
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
    return
  }

  announceAdded()
}

/**
 * How an added line is announced, as the boards draw it: on a desktop
 * the cart drawer opens with it; on a phone a toast shows the product's
 * photograph and "View", which opens the drawer.
 */
function announceAdded() {
  const name = productName.value ?? ''
  if (drawer.desktop.value) {
    drawer.show(name)
    return
  }
  const imagePath = 'mainImagePath' in product.value ? product.value.mainImagePath : undefined
  toast.add({
    title: t('toast.added_title'),
    description: name,
    icon: imagePath ? undefined : 'i-lucide-circle-check',
    avatar: imagePath
      ? { src: img(imagePath, { width: 96, height: 96, fit: 'cover' }, { provider: 'mediaStream' }), alt: name }
      : undefined,
    color: 'success',
    actions: [{
      label: t('toast.view'),
      color: 'neutral',
      variant: 'solid',
      onClick: () => drawer.show(name),
    }],
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
    :icon="icon"
    :size="size"
    square
    loading-auto
    :color="color"
    variant="solid"
    :disabled="disabled"
    :aria-label="disabled ? t('unavailable') : text"
    :title="disabled ? t('unavailable') : text"
    @click.prevent="addToCartEvent"
  />
  <UButton
    v-else
    :icon="icon"
    :label="visibleLabel"
    :size="size"
    :trailing="block"
    loading-auto
    :color="color"
    variant="solid"
    :disabled="disabled"
    :aria-label="disabled ? t('unavailable') : text"
    :ui="{ base: block ? 'w-full place-content-center place-items-center' : '' }"
    @click.prevent="addToCartEvent"
  />
</template>

<i18n lang="yaml">
el:
  unavailable: Μή Διαθέσιμο
  toast:
    added_title: Προστέθηκε στο καλάθι
    view: Προβολή
    failed_title: Δεν προστέθηκε στο καλάθι
    failed_description: Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.
en:
  unavailable: Unavailable
  toast:
    added_title: Added to cart
    view: View
    failed_title: Not added to your basket
    failed_description: Something went wrong. Try again in a moment.
</i18n>
