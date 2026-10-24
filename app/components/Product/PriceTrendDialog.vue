<script lang="ts" setup>
/**
 * The product's price trend, opened from the product page: a sheet from
 * the bottom on a phone, a dialog from `sm` up, as the review sheet is
 * (`Product/Review.vue`). The page mounts it on the first open, and the
 * body asks for the history then, so a visitor who never opens it costs
 * no request.
 */

defineProps<{
  productId: number
  productName: string
}>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { isMobile } = useDevice()

// Nuxt resolves these literal names to the components at build time.
const UDrawer = resolveComponent('UDrawer')
const UModal = resolveComponent('UModal')

const sheetUi = {
  content: 'max-h-[92dvh]',
  container: 'gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
  title: 'font-display text-xl font-bold',
  description: 'sr-only',
}

const modalUi = {
  ...DIALOG_UI,
  content: `${DIALOG_UI.content} max-w-3xl`,
  description: 'sr-only',
}
</script>

<template>
  <component
    :is="isMobile ? UDrawer : UModal"
    v-model:open="open"
    :title="t('title')"
    :description="t('description', { product: productName })"
    v-bind="isMobile ? { direction: 'bottom', handle: true } : {}"
    :ui="isMobile ? sheetUi : modalUi"
  >
    <template #body>
      <ProductPriceTrend
        :product-id="productId"
        :product-name="productName"
      />
    </template>
  </component>
</template>

<i18n lang="yaml">
el:
  title: Εξέλιξη τιμής
  description: Πώς άλλαξε η τιμή του προϊόντος {product}.
en:
  title: Price history
  description: How the price of {product} has changed.
</i18n>
