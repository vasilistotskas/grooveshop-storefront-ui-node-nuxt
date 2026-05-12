<script lang="ts" setup>
/**
 * Selected-locker wrapper card for any
 * {@link ShippingCarrier} with ``usesGenericPicker: true``. Reads
 * the previously-picked locker from ``formState`` (via the
 * adapter's ``readSelectedLocker``), opens the
 * {@link CheckoutGenericLockerPicker} when the shopper clicks
 * Επιλογή / Αλλαγή, and writes back through ``applyToFormState``.
 *
 * No carrier-specific knowledge in here — adding ELTA / Speedex
 * means just shipping a new ``shared/shipping/providers/<code>.ts``
 * adapter; this component renders untouched.
 */
const formState = defineModel<Record<string, any>>('formState', {
  required: true,
})

const props = defineProps<{
  carrier: ShippingCarrier
  initialPostalCode?: string
  initialCity?: string
  countryCode?: string
  /** Optional pre-fetched provider metadata (from the
   *  ``/api/v1/shipping/options`` response). Forwarded to the
   *  picker so the map can pick up carrier-specific tile providers,
   *  default centre, and zoom from ``ShippingProvider.metadata``. */
  providerMetadata?: CarrierProviderMetadata | null
}>()

const { t } = useI18n()

// Picker state is exposed via ``v-model:open`` so the parent
// (StepShipping) can open the modal when the shopper clicks Continue
// without first picking a locker — replaces the previous disabled
// Continue button, which gave no signal about what was missing.
const isOpen = defineModel<boolean>('open', { default: false })

const locker = computed<Locker | null>(
  () => props.carrier.readSelectedLocker(formState.value),
)

const hasLocker = computed(() => locker.value !== null)

function onSelected(picked: Locker): void {
  props.carrier.applyToFormState(formState.value, picked)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Selected card — visible after a pick -->
    <div
      v-if="hasLocker && locker"
      class="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <UIcon
        name="i-lucide-package-check"
        class="mt-1 size-6 shrink-0 text-primary-600 dark:text-primary-400"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="break-words font-semibold">{{ locker.name }}</span>
        <span class="text-sm text-neutral-700 dark:text-neutral-200">
          {{ locker.addressLine1 }}<span v-if="locker.addressLine2">, {{ locker.addressLine2 }}</span>
        </span>
        <span class="text-xs text-neutral-600 dark:text-neutral-300">
          {{ locker.postalCode }} {{ locker.city }}
        </span>
        <span
          v-if="locker.workingHours"
          class="text-xs text-neutral-600 dark:text-neutral-300"
        >
          <UIcon name="i-lucide-clock" class="-mt-0.5 size-3 align-middle" />
          {{ locker.workingHours }}
        </span>
        <span class="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {{ t('shipping.locker_picker.id_label') }}: {{ locker.id }}
        </span>
      </div>
      <UButton
        size="sm"
        variant="ghost"
        icon="i-lucide-pencil"
        :aria-label="t('shipping.locker_picker.change')"
        @click="isOpen = true"
      >
        {{ t('shipping.locker_picker.change') }}
      </UButton>
    </div>

    <!-- Pick CTA — visible before the first pick -->
    <UButton
      v-else
      block
      size="lg"
      color="primary"
      icon="i-lucide-map-pin"
      @click="isOpen = true"
    >
      {{ t('shipping.locker_picker.choose', { carrier: carrier.label }) }}
    </UButton>

    <!-- Picker modal — lazy so its bundle is split when not open -->
    <LazyCheckoutGenericLockerPicker
      v-model:open="isOpen"
      :carrier="carrier"
      :initial-postal-code="initialPostalCode"
      :initial-city="initialCity"
      :country-code="countryCode"
      :provider-metadata="providerMetadata"
      @selected="onSelected"
    />
  </div>
</template>
