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

// State
const pickerOpen = ref(false)

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
  <div class="space-y-3">
    <!-- Empty state — no locker chosen yet -->
    <template v-if="!hasLocker">
      <UButton
        block
        size="lg"
        icon="i-lucide-map-pin"
        color="primary"
        @click="pickerOpen = true"
      >
        {{ t('shipping.boxnow.select_locker') }}
      </UButton>
    </template>

    <!-- Locker selected — show a summary card -->
    <template v-else>
      <UCard variant="soft">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 font-semibold">
              <UIcon name="i-lucide-map-pin" class="size-5 shrink-0 text-primary" />
              <span>{{ lockerDisplayName }}</span>
            </div>
            <UBadge color="success" variant="soft">
              {{ t('shipping.boxnow.selected_locker.title') }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-1 text-sm text-neutral-600 dark:text-neutral-200">
          <p>{{ locker?.boxnowLockerAddressLine1 }}</p>
          <p v-if="locker?.boxnowLockerAddressLine2">
            {{ locker.boxnowLockerAddressLine2 }}
          </p>
          <p>{{ locker?.boxnowLockerPostalCode }}</p>
          <p v-if="locker?.boxnowLockerNote" class="italic">
            {{ locker.boxnowLockerNote }}
          </p>
          <p class="mt-2 text-xs text-neutral-600 dark:text-neutral-200">
            <span class="font-medium">{{ t('shipping.boxnow.selected_locker.id_label') }}:</span>
            {{ formState.boxnowLockerId }}
          </p>
        </div>

        <template #footer>
          <UButton
            variant="outline"
            icon="i-lucide-map-pin"
            size="sm"
            @click="pickerOpen = true"
          >
            {{ t('shipping.boxnow.change_locker') }}
          </UButton>
        </template>
      </UCard>
    </template>

    <!-- Picker modal — always mounted so VueUse's postMessage listener
         is active and the modal can open instantly without a mounting
         delay. The iframe only renders inside the modal body so there
         is no hidden network request when the picker is closed. -->
    <CheckoutBoxNowLockerPicker
      v-model:open="pickerOpen"
      :partner-id="props.partnerId"
      @selected="onSelected"
    />
  </div>
</template>
