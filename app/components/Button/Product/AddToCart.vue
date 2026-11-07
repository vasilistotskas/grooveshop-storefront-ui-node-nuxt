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

// A browse-only store takes no orders: there is nothing to buy, so no
// buying control renders (every add-to-cart button routes through here).
const cartEnabled = useStoreFeature('cart')
const { product, quantity, text } = toRefs(props)
const { t } = useStoreI18n('components/Button/Product/AddToCart')

const { disabled, addToCart } = useAddToCartControl({ t, product, quantity })

const visibleLabel = computed(() => {
  if (disabled.value) {
    return t('unavailable')
  }
  return props.label ?? text.value
})
</script>

<template>
  <!-- The store's accent, solid: this is the shop's primary action.
       It used to be `success` in a `subtle` variant — a pale green that
       reads as "that worked", not "buy this", and the same colour the
       toast uses to confirm it afterwards. -->
  <UButton
    v-if="cartEnabled && iconOnly"
    :icon="icon"
    :size="size"
    square
    loading-auto
    :color="color"
    variant="solid"
    :disabled="disabled"
    :aria-label="disabled ? t('unavailable') : text"
    :title="disabled ? t('unavailable') : text"
    @click.prevent="addToCart"
  />
  <UButton
    v-else-if="cartEnabled"
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
    @click.prevent="addToCart"
  />
</template>

<i18n lang="yaml">
el:
  unavailable: Μή Διαθέσιμο
  toast:
    adding_title: Προσθήκη στο καλάθι…
    added_title: Προστέθηκε στο καλάθι
    added_many: Προστέθηκαν {count} προϊόντα στο καλάθι
    view: Προβολή
    failed_title: Δεν προστέθηκε στο καλάθι
    failed_description: Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.
en:
  unavailable: Unavailable
  toast:
    adding_title: Adding to cart…
    added_title: Added to cart
    added_many: '{count} items added to cart'
    view: View
    failed_title: Not added to your basket
    failed_description: Something went wrong. Try again in a moment.
</i18n>
