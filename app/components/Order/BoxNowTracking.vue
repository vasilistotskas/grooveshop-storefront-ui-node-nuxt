<script setup lang="ts">
// Props (used directly in template — no script-side reference needed)
defineProps<{
  shipment: BoxNowShipmentDetail
  orderId: number
}>()

// Composables
const { t } = useI18n()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-xl font-semibold">
          {{ t('tracking.boxnow.title') }}
        </h2>
        <OrderBoxNowStateBadge :state="shipment.parcelState" />
      </div>
    </template>

    <div class="space-y-4">
      <!-- Voucher row -->
      <div
        v-if="shipment.parcelId"
        class="flex justify-between gap-4"
      >
        <span class="text-muted">{{ t('tracking.boxnow.voucher') }}</span>
        <span class="font-mono font-semibold">{{ shipment.parcelId }}</span>
      </div>

      <!-- Locker row -->
      <div
        v-if="shipment.locker"
        class="flex justify-between gap-4"
      >
        <span class="text-muted">{{ t('tracking.boxnow.locker') }}</span>
        <span class="text-right">
          <div class="font-medium">{{ shipment.locker.name }}</div>
          <div class="text-sm text-muted">
            {{ shipment.locker.addressLine1 }}, {{ shipment.locker.postalCode }}
          </div>
        </span>
      </div>

      <!-- Last update row -->
      <div
        v-if="shipment.lastEventAt"
        class="flex justify-between gap-4"
      >
        <span class="text-muted">{{ t('tracking.boxnow.last_update') }}</span>
        <span>{{ formatDate(shipment.lastEventAt) }}</span>
      </div>

      <USeparator />

      <!-- Timeline -->
      <OrderBoxNowEventTimeline :events="shipment.events ?? []" />
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          v-if="shipment.parcelId"
          :to="`https://boxnow.gr/en?track=${shipment.parcelId}`"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          icon="i-lucide-external-link"
        >
          {{ t('tracking.boxnow.open_tracking') }}
        </UButton>
        <UButton
          v-if="shipment.parcelId"
          :to="`/api/orders/${orderId}/boxnow-label`"
          target="_blank"
          icon="i-lucide-download"
        >
          {{ t('tracking.boxnow.label_download') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
