<script lang="ts" setup>
// Two-way binding: parent passes formState; we read boxnowLockerId +
// boxnowLocker from it and write back both when the picker resolves.
// Using defineModel<Record<string, any>>('formState') matches the pattern
// established by StepPersonalInfo and StepPayment in this codebase.
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  // BoxNow partner ID — passed down from the page-level component which
  // reads it from useRuntimeConfig. Threading the prop through avoids
  // mocking useRuntimeConfig in component tests.
  partnerId: string
}>()

// Composables
const { t } = useI18n()

// State — exposed via ``v-model:open`` so the parent (StepShipping)
// can pop the picker when the shopper clicks Continue without first
// having picked a locker. Without this, the previous UX disabled the
// Continue button and gave no signal that a locker was the missing
// piece — a real customer hit this and bounced to ACS instead.
const pickerOpen = defineModel<boolean>('open', { default: false })

// Computed
const hasLocker = computed(() => !!formState.value.boxnowLockerId)

const locker = computed<BoxNowSelectedLocker | null>(
  () => formState.value.boxnowLocker ?? null,
)

const lockerDisplayName = computed(
  () => locker.value?.boxnowLockerName ?? formState.value.boxnowLockerId ?? '',
)

// Methods — write both fields back through the model
function onSelected(selected: BoxNowSelectedLocker) {
  formState.value.boxnowLockerId = selected.boxnowLockerId
  formState.value.boxnowLocker = selected
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Empty state — no locker chosen yet -->
    <UButton
      v-if="!hasLocker"
      block
      size="lg"
      icon="i-lucide-map-pin"
      color="neutral"
      @click="() => { pickerOpen = true }"
    >
      {{ t('shipping.boxnow.select_locker') }}
    </UButton>

    <!-- Locker selected — show a summary card -->
    <div
      v-else
      class="
        flex flex-col gap-3 rounded-2xl bg-default p-4 ring ring-default
      "
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <UBadge color="secondary" variant="soft">
          {{ t('shipping.boxnow.selected_locker.title') }}
        </UBadge>
      </div>
      <div class="flex flex-col gap-1">
        <p data-testid="selected-locker-name" class="font-semibold text-highlighted">
          {{ lockerDisplayName }}
        </p>
        <div class="flex flex-col gap-0.5 text-sm text-toned">
          <p>{{ locker?.boxnowLockerAddressLine1 }}</p>
          <p v-if="locker?.boxnowLockerAddressLine2">
            {{ locker.boxnowLockerAddressLine2 }}
          </p>
          <p>{{ locker?.boxnowLockerPostalCode }}</p>
          <p v-if="locker?.boxnowLockerNote" class="italic">
            {{ locker.boxnowLockerNote }}
          </p>
        </div>
        <p class="mt-1 font-mono text-xs text-toned">
          {{ t('shipping.boxnow.selected_locker.id_label') }}: {{ formState.boxnowLockerId }}
        </p>
      </div>
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-map"
        size="sm"
        class="w-fit"
        @click="() => { pickerOpen = true }"
      >
        {{ t('shipping.boxnow.change_locker') }}
      </UButton>
    </div>

    <!-- Picker modal — always mounted so VueUse's postMessage listener
         is active and the modal can open instantly without a mounting
         delay. The iframe only renders inside the modal body so there
         is no hidden network request when the picker is closed. -->
    <CheckoutBoxNowLockerPicker
      v-model:open="pickerOpen"
      :partner-id="props.partnerId"
      :country-code="formState.country"
      @selected="onSelected"
    />
  </div>
</template>
