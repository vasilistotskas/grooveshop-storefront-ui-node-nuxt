<script setup lang="ts">
// Props (used directly in template — no script-side reference needed)
defineProps<{
  shipment: AcsShipmentDetail
  orderId: number
}>()

// Composables
const { t, locale } = useI18n()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-xl font-semibold">
          {{ t('tracking.acs.title') }}
        </h2>
        <OrderAcsStateBadge :state="shipment.shipmentState" />
      </div>
    </template>

    <div class="space-y-4">
      <!-- Voucher row -->
      <div
        v-if="shipment.voucherNo"
        class="flex justify-between gap-4"
      >
        <span class="text-muted">{{ t('tracking.acs.voucher') }}</span>
        <span class="font-mono font-semibold">{{ shipment.voucherNo }}</span>
      </div>

      <!-- Pickup-station row (Phase 2 — only set on Smartpoint orders) -->
      <div
        v-if="shipment.station"
        class="flex justify-between gap-4"
      >
        <span class="text-muted">{{ t('tracking.acs.station') }}</span>
        <span class="text-right">
          <div class="font-medium">{{ shipment.station.name }}</div>
          <div class="text-sm text-muted">
            {{ shipment.station.addressLine1 }}, {{ shipment.station.postalCode }}
          </div>
        </span>
      </div>

      <!-- Last update row -->
      <div
        v-if="shipment.lastEventAt"
        class="flex justify-between gap-4"
      >
        <span class="text-muted">{{ t('tracking.acs.last_update') }}</span>
        <NuxtTime
          :datetime="shipment.lastEventAt"
          :locale="locale"
          relative
          numeric="auto"
        />
      </div>

      <USeparator />

      <!-- Timeline -->
      <OrderAcsEventTimeline :events="shipment.events ?? []" />
    </div>

    <template #footer>
      <!-- ACS's customer-facing tracking SPA lives at
           ``webapp.acscourier.net`` and reads the voucher from the
           URL path (NOT a query string — that's why the older
           ``/el/track-and-trace/?p=`` URL didn't deep-link). The
           path-based form opens straight onto the customer's
           shipment with sender/recipient pre-populated. -->
      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          v-if="shipment.voucherNo"
          :to="`https://webapp.acscourier.net/track-shipment/${shipment.voucherNo}`"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          icon="i-lucide-external-link"
        >
          {{ t('tracking.acs.open_tracking') }}
        </UButton>
        <UButton
          v-if="shipment.voucherNo"
          :to="`/api/orders/${orderId}/acs-label`"
          target="_blank"
          icon="i-lucide-download"
        >
          {{ t('tracking.acs.label_download') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
