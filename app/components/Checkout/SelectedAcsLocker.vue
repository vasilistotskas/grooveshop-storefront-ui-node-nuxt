<script lang="ts" setup>
/**
 * Selected-locker card for ACS Smartpoint pickup checkout.
 *
 * Mirrors {@link CheckoutSelectedBoxNowLocker} but reads from the
 * {@link AcsStation} cache via our own server-side picker — there is
 * no third-party widget to embed.
 */

const formState = defineModel<Record<string, any>>('formState', {
  required: true,
})

const props = defineProps<{
  /** Pre-fill picker postcode from the address step. */
  initialPostalCode?: string
  /** Optional fallback city for the picker search. */
  initialCity?: string
}>()

// Composables
const { t } = useI18n()

// State
const pickerOpen = ref(false)

// Computed
const hasStation = computed(() => !!formState.value.acsStationExternalId)

const station = computed<AcsStation | null>(
  () => formState.value.acsStation ?? null,
)

const stationDisplayName = computed(
  () =>
    station.value?.name
    ?? formState.value.acsStationExternalId
    ?? '',
)

// Methods
function onSelected(selected: AcsStation) {
  formState.value.acsStationExternalId = selected.externalId
  formState.value.acsStationBranch = selected.branchCode ?? ''
  formState.value.acsStation = selected
}
</script>

<template>
  <div class="space-y-3">
    <!-- Empty state -->
    <template v-if="!hasStation">
      <UButton
        block
        size="lg"
        icon="i-lucide-map-pin"
        color="primary"
        @click="pickerOpen = true"
      >
        {{ t('shipping.acs.select_locker') }}
      </UButton>
    </template>

    <!-- Selected card -->
    <template v-else>
      <UCard variant="soft">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 font-semibold">
              <UIcon
                name="i-lucide-map-pin"
                class="size-5 shrink-0 text-primary"
              />
              <span>{{ stationDisplayName }}</span>
            </div>
            <UBadge color="success" variant="soft">
              {{ t('shipping.acs.selected_locker.title') }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-1 text-sm text-neutral-600 dark:text-neutral-200">
          <p>{{ station?.addressLine1 }}</p>
          <p v-if="station?.city">
            {{ station.city }}
          </p>
          <p>{{ station?.postalCode }}</p>
          <p v-if="station?.workingHours" class="text-xs italic">
            {{ station.workingHours }}
          </p>
          <p class="mt-2 text-xs text-neutral-600 dark:text-neutral-200">
            <span class="font-medium">
              {{ t('shipping.acs.selected_locker.id_label') }}:
            </span>
            {{ formState.acsStationExternalId }}
          </p>
        </div>

        <template #footer>
          <UButton
            variant="outline"
            icon="i-lucide-map-pin"
            size="sm"
            @click="pickerOpen = true"
          >
            {{ t('shipping.acs.change_locker') }}
          </UButton>
        </template>
      </UCard>
    </template>

    <!-- Picker modal — kept always-mounted so the close→reopen
         cycle keeps the previously fetched results in memory and the
         user perceives instant redisplay. -->
    <CheckoutAcsLockerPicker
      v-model:open="pickerOpen"
      :initial-postal-code="props.initialPostalCode"
      :initial-city="props.initialCity"
      @selected="onSelected"
    />
  </div>
</template>
