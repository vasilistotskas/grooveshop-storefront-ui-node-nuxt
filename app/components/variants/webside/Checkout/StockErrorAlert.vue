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

const { t } = useI18n()
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
            class="rounded-lg bg-warning-50 dark:bg-warning-950/50 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-warning-900 dark:text-warning-100 truncate">
                  {{ item.productName }}
                </p>
                <p class="text-sm text-warning-700 dark:text-warning-300 mt-1">
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
    requested_vs_available: 'Ζητήθηκαν: {requested} | Διαθέσιμα: {available}'
    shortage: '-{count}'
    update_cart: Ενημέρωση Καλαθιού
    retry: Δοκιμή Ξανά
</i18n>
