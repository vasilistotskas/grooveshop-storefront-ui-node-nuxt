<script lang="ts" setup>
/**
 * Carrier-agnostic locker picker for any
 * {@link ShippingCarrier} that sets ``usesGenericPicker: true``
 * and exposes ``fetchByPostal``. Phase-1 ships the list/search UX
 * (matching the Modal shell of {@link CheckoutBoxNowLockerPicker}
 * for visual consistency); Phase-2 adds the map tab beside the
 * list.
 *
 * The picker never reaches into provider-specific form-state keys;
 * the adapter does that via ``adapter.applyToFormState`` when the
 * shopper picks a row.
 */
import type { Locker, ShippingCarrier } from '#shared/shipping/interfaces'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  carrier: ShippingCarrier
  initialPostalCode?: string
  initialCity?: string
  countryCode?: string
}>()

const emit = defineEmits<{
  selected: [locker: Locker]
  close: []
}>()

const { t } = useI18n()

// State
const postal = ref(props.initialPostalCode ?? '')
const city = ref(props.initialCity ?? '')
const stations = ref<Locker[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const initialSearchDone = ref(false)

let abortController: AbortController | null = null
const SEARCH_DEBOUNCE_MS = 300

async function runSearch(): Promise<void> {
  if (!props.carrier.fetchByPostal) {
    errorMessage.value = t('shipping.locker_picker.unsupported')
    return
  }
  const trimmedPostal = postal.value.trim()
  if (trimmedPostal.length < 4) {
    stations.value = []
    return
  }
  abortController?.abort()
  abortController = new AbortController()
  loading.value = true
  errorMessage.value = null
  try {
    const rows = await props.carrier.fetchByPostal({
      postalCode: trimmedPostal,
      city: city.value.trim() || undefined,
      country: props.countryCode,
      signal: abortController.signal,
    })
    stations.value = rows
  }
  catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    log.warn('shipping/picker', 'locker search failed', { error: err })
    errorMessage.value = t('shipping.locker_picker.error')
    stations.value = []
  }
  finally {
    loading.value = false
    initialSearchDone.value = true
  }
}

const debouncedSearch = useDebounceFn(runSearch, SEARCH_DEBOUNCE_MS)

watch([postal, city], () => {
  void debouncedSearch()
})

// Re-search every time the modal opens with the latest postal
// hint — the customer might have updated their checkout address
// between picker opens.
watch(open, (val) => {
  if (val) {
    if (props.initialPostalCode) postal.value = props.initialPostalCode
    if (props.initialCity) city.value = props.initialCity
    initialSearchDone.value = false
    void runSearch()
  }
  else {
    abortController?.abort()
    abortController = null
  }
})

onUnmounted(() => abortController?.abort())

function selectLocker(locker: Locker): void {
  emit('selected', locker)
  open.value = false
}

function onClose(): void {
  open.value = false
  emit('close')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!loading"
    :ui="{
      content: 'h-screen max-w-4xl',
      body: 'min-h-0 flex-1 overflow-y-auto p-0',
    }"
  >
    <template #header>
      <div class="flex w-full items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ t('shipping.locker_picker.modal_title', { carrier: carrier.label }) }}
        </h2>
        <UButton
          variant="ghost"
          icon="i-lucide-x"
          size="sm"
          :aria-label="t('close')"
          @click="onClose"
        />
      </div>
    </template>

    <template #body>
      <div class="flex h-full flex-col">
        <!-- Search controls -->
        <div class="flex flex-col gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800 sm:flex-row">
          <UInput
            v-model="postal"
            :placeholder="t('shipping.locker_picker.postal_placeholder')"
            icon="i-lucide-map-pin"
            class="sm:flex-1"
            :loading="loading"
            inputmode="numeric"
            autofocus
          />
          <UInput
            v-model="city"
            :placeholder="t('shipping.locker_picker.city_placeholder')"
            icon="i-lucide-building-2"
            class="sm:flex-1"
          />
        </div>

        <!-- Results list -->
        <div
          class="relative min-h-0 flex-1 overflow-y-auto"
          :aria-busy="loading"
        >
          <!-- Loading skeleton — five rows matching the row geometry
               so there's no layout shift when results arrive. -->
          <ul
            v-if="loading && stations.length === 0"
            class="flex flex-col gap-2 p-4"
            :aria-label="t('shipping.locker_picker.loading')"
          >
            <li v-for="i in 5" :key="i" class="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <USkeleton class="h-10 w-10 rounded-full" />
              <div class="flex-1 space-y-2">
                <USkeleton class="h-4 w-3/4" />
                <USkeleton class="h-3 w-1/2" />
              </div>
            </li>
          </ul>

          <!-- Error state -->
          <UAlert
            v-else-if="errorMessage"
            class="m-4"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="t('shipping.locker_picker.error_title')"
            :description="errorMessage"
          />

          <!-- Empty / no-results state -->
          <div
            v-else-if="initialSearchDone && stations.length === 0"
            class="flex h-full flex-col items-center justify-center gap-2 p-4 text-center"
          >
            <UIcon name="i-lucide-map-pin-off" class="size-10 text-neutral-400" />
            <p class="text-base font-medium">
              {{ t('shipping.locker_picker.empty_title') }}
            </p>
            <p class="text-sm text-neutral-700 dark:text-neutral-200">
              {{ t('shipping.locker_picker.empty_description') }}
            </p>
          </div>

          <!-- Pre-search hint -->
          <div
            v-else-if="!initialSearchDone && stations.length === 0"
            class="flex h-full flex-col items-center justify-center gap-2 p-4 text-center"
          >
            <UIcon name="i-lucide-search" class="size-10 text-neutral-400" />
            <p class="text-base font-medium">
              {{ t('shipping.locker_picker.search_prompt_title') }}
            </p>
            <p class="text-sm text-neutral-700 dark:text-neutral-200">
              {{ t('shipping.locker_picker.search_prompt_description') }}
            </p>
          </div>

          <!-- Results -->
          <ul v-else class="flex flex-col gap-2 p-4">
            <li
              v-for="station in stations"
              :key="station.id"
            >
              <button
                type="button"
                class="flex w-full items-start gap-3 rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:border-primary-500 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-800 dark:hover:border-primary-400 dark:hover:bg-primary-950"
                @click="selectLocker(station)"
              >
                <UIcon
                  name="i-lucide-package"
                  class="mt-1 size-5 shrink-0 text-primary-600 dark:text-primary-400"
                />
                <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="break-words font-semibold">{{ station.name }}</span>
                  <span class="text-sm text-neutral-700 dark:text-neutral-200">
                    {{ station.addressLine1 }}<span v-if="station.addressLine2">, {{ station.addressLine2 }}</span>
                  </span>
                  <span class="text-xs text-neutral-600 dark:text-neutral-300">
                    {{ station.postalCode }} {{ station.city }}
                  </span>
                  <span
                    v-if="station.workingHours"
                    class="mt-1 text-xs text-neutral-600 dark:text-neutral-300"
                  >
                    <UIcon name="i-lucide-clock" class="-mt-0.5 size-3" />
                    {{ station.workingHours }}
                  </span>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="mt-1 size-5 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  close: Κλείσιμο
</i18n>
