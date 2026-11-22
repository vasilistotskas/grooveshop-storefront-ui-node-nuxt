<script lang="ts" setup>
/**
 * "Notify me" for a sold-out product: a compact button that opens the
 * alerts dialog (`ProductNotifyMe`) on the restock alert. A bell and a short
 * label, or the bell alone (`iconOnly`), with the full sentence as its
 * accessible name; once the signed-in shopper has set the alert, a ringing
 * bell and "on", and the dialog shows the alert and turns it off. The dialog
 * mounts on the first open. A listing payload carries no price-alert flag,
 * so this offers the restock alert only; the product page offers both.
 *
 * The platform's restock control wherever a product is listed: the product
 * card, where it takes the add-to-cart button's places, and through
 * `resolvePart('product_restock_alert')` any shared component that sells one
 * product. The caller places it (its classes go on the button) and decides
 * when it shows (sold out, alerts on).
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  productId: number
  productName: string
  productImage?: string | null
  /** The bell alone, square, its name for a screen reader (a phone's card). */
  iconOnly?: boolean
}>()

const { t } = useStoreI18n('components/Product/RestockAlert')

const notify = reactive({ mounted: false, open: false, kind: 'restock' as ProductAlertKindEnum })

const { activeAlert } = useProductActiveAlert({ productId: () => props.productId, kind: () => 'restock' })

const accessibleName = computed(() => (activeAlert.value ? t('active_name') : t('notify_name')))
</script>

<template>
  <!-- A 44px target on a phone (WCAG 2.5.5), as the design draws it from
       `sm` up. Outlined in both states: it sits on the photograph's tile,
       where a soft fill would vanish. -->
  <UButton
    v-bind="$attrs"
    :icon="activeAlert ? 'i-lucide-bell-ring' : 'i-lucide-bell'"
    :label="iconOnly ? undefined : activeAlert ? t('active') : t('notify')"
    :aria-label="accessibleName"
    :title="iconOnly ? accessibleName : undefined"
    :square="iconOnly"
    color="neutral"
    variant="outline"
    size="sm"
    class="
      min-h-11
      sm:min-h-0
    "
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
  # The visible label, and the accessible name, which starts with it (WCAG 2.5.3).
  notify: Ειδοποίηση
  notify_name: Ειδοποίηση όταν ξαναέρθει
  active: Ενεργή
  active_name: Ενεργή ειδοποίηση διαθεσιμότητας
en:
  notify: Notify me
  notify_name: Notify me when it's back
  active: Alert on
  active_name: 'Alert on: back in stock'
</i18n>
