<script lang="ts" setup>
defineProps<{
  stockError: {
    show: boolean
    failedItems: Array<{
      productId: number
      productName: string
      available: number
      requested: number
    }>
  }
}>()

const emit = defineEmits<{
  dismiss: []
  retry: []
}>()

const { t } = useStoreI18n('components/Checkout/StockErrorAlert')
const localePath = useLocalePath()
</script>

<template>
  <UAlert
    color="warning"
    variant="soft"
    :title="t('stock_error.title')"
    :description="t('stock_error.description')"
    icon="i-heroicons-exclamation-triangle"
    :close="{ variant: 'link' }"
    class="mb-6"
    @update:open="(value: boolean) => { if (!value) emit('dismiss') }"
  >
    <template #description>
      <div class="space-y-3">
        <p class="text-sm">
          {{ t('stock_error.description') }}
        </p>

        <!-- Failed Items List -->
        <div class="space-y-2">
          <div
            v-for="item in stockError.failedItems"
            :key="item.productId"
            class="
              rounded-lg bg-warning-50 p-3
              dark:bg-warning-950/50
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-default">
                  {{ item.productName }}
                </p>
                <p class="mt-1 text-sm text-toned">
                  {{ t('stock_error.requested_vs_available', {
                    requested: item.requested,
                    available: item.available,
                  }) }}
                </p>
              </div>
              <UBadge color="warning" variant="subtle">
                {{ t('stock_error.shortage', { count: item.requested - item.available }) }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-2 pt-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-shopping-cart"
            :to="localePath('cart')"
          >
            {{ t('stock_error.update_cart') }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-arrow-path"
            @click="emit('retry')"
          >
            {{ t('stock_error.retry') }}
          </UButton>
        </div>
      </div>
    </template>
  </UAlert>
</template>

<i18n lang="yaml">
el:
  stock_error:
    title: Ανεπαρκές Απόθεμα
    description: Ορισμένα προϊόντα στο καλάθι σου δεν έχουν επαρκές απόθεμα για να ολοκληρωθεί η παραγγελία.
    requested_vs_available: "Ζητήθηκαν: {requested} {'|'} Διαθέσιμα: {available}"
    shortage: '-{count}'
    update_cart: Ενημέρωση Καλαθιού
    retry: Δοκιμή Ξανά
en:
  stock_error:
    title: Not Enough Stock
    description: Some items in your cart do not have enough stock to complete this order.
    requested_vs_available: "Requested: {requested} {'|'} Available: {available}"
    shortage: '-{count}'
    update_cart: Update Cart
    retry: Try Again
</i18n>
