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
      class="flex flex-col gap-3 rounded-2xl bg-default p-4 ring ring-default"
    >
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-package-check"
          class="mt-0.5 size-5 shrink-0 text-highlighted"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="font-semibold break-words text-highlighted">{{ locker.name }}</span>
          <span class="text-sm text-toned">
            {{ locker.addressLine1 }}<span v-if="locker.addressLine2">, {{ locker.addressLine2 }}</span>
          </span>
          <span class="text-xs text-toned">
            {{ locker.postalCode }} {{ locker.city }}
          </span>
          <span
            v-if="locker.workingHours"
            class="text-xs text-toned"
          >
            <UIcon name="i-lucide-clock" class="-mt-0.5 size-3 align-middle" />
            {{ locker.workingHours }}
          </span>
          <span class="mt-1 font-mono text-xs text-toned">
            {{ t('shipping.locker_picker.id_label') }}: {{ locker.id }}
          </span>
        </div>
      </div>
      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-map"
        class="w-fit"
        @click="() => { isOpen = true }"
      >
        {{ t('shipping.locker_picker.change') }}
      </UButton>
    </div>

    <!-- Pick CTA — visible before the first pick -->
    <UButton
      v-else
      block
      size="lg"
      color="neutral"
      icon="i-lucide-map-pin"
      @click="() => { isOpen = true }"
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
      @selected="onSelected"
    />
  </div>
</template>
