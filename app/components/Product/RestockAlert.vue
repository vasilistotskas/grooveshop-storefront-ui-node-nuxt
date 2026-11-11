<script lang="ts" setup>
/**
 * "Notify me when it's back" for a sold-out product: a link-styled button
 * that opens the alerts dialog (`ProductNotifyMe`) on the restock alert. The
 * dialog mounts on the first open, so its lookup happens only for a shopper
 * who asked. A listing payload carries no price-alert flag, so this offers
 * the restock alert only; the product page offers both.
 *
 * The platform's restock control wherever a product is listed: the product
 * card, and through `resolvePart('product_restock_alert')` any shared
 * component that sells one product. The caller places it (its classes go on
 * the button) and decides when it shows (sold out, alerts on).
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  productId: number
  productName: string
  productImage?: string | null
}>()

const { t } = useStoreI18n('components/Product/RestockAlert')

const notify = reactive({ mounted: false, open: false, kind: 'restock' as ProductAlertKindEnum })
</script>

<template>
  <UButton
    v-bind="$attrs"
    :label="t('notify_back')"
    color="neutral"
    variant="link"
    size="sm"
    class="p-0 text-[0.8125rem] font-semibold text-accent"
    @click="() => { notify.mounted = true; notify.open = true }"
  />
  <LazyProductNotifyMe
    v-if="notify.mounted"
    v-model:open="notify.open"
    v-model:kind="notify.kind"
    :product-id="productId"
    :product-name="productName"
    :product-image="productImage"
    sold-out
    :price-drop="false"
  />
</template>

<i18n lang="yaml">
el:
  notify_back: Ειδοποίησέ με όταν ξαναέρθει
en:
  notify_back: Notify me when it's back
</i18n>
