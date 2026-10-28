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

const { t } = useStoreI18n('components/variants/webside/Checkout/GenericLockerPicker')

const {
  activeTab,
  postal,
  city,
  stations,
  loading,
  errorMessage,
  initialSearchDone,
  mapLockers,
  mapLoading,
  mapError,
  tabs,
} = useLockerPicker({ props, open })

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
      // ``dvh``, not ``h-screen``/100vh: on mobile 100vh is the
      // viewport with the browser chrome HIDDEN, so a modal sized to
      // it is taller than the visible area and its body — the map
      // iframe — is pushed under the toolbar. Same unit the chat
      // widget and the product image modal already use.
      content: 'h-dvh max-w-4xl',
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
        <!-- View toggle: List ↔ Map. Map tab only renders when the
             carrier exposes ``fetchAll``. Tabs persist their content
             so switching back to the list doesn't drop search state. -->
        <UTabs
          v-model="activeTab"
          :items="tabs"
          variant="pill"
          size="sm"
          :unmount-on-hide="false"
          class="border-b border-neutral-200 dark:border-neutral-800"
          :ui="{
            list: 'm-2',
            root: 'flex h-full min-h-0 flex-col',
            content: `
              flex size-full min-h-0 flex-col
              focus:outline-none
            `,
          }"
        >
          <template #content="{ item }">
            <div v-if="item.value === 'map'" id="locker-map" class="size-full min-h-[24rem] flex-1 sm:min-h-[28rem] md:min-h-[32rem] lg:min-h-[40rem]">
              <ClientOnly>
                <LazyCheckoutSmartpointMap
                  :lockers="mapLockers"
                  :loading="mapLoading"
                  @selected="(locker) => selectLocker(locker)"
                />
                <template #fallback>
                  <div class="flex size-full items-center justify-center">
                    <USkeleton class="size-full" />
                  </div>
                </template>
              </ClientOnly>
              <UAlert
                v-if="mapError"
                class="m-4"
                color="error"
                variant="subtle"
                icon="i-lucide-circle-alert"
                :title="t('shipping.locker_picker.error_title')"
                :description="mapError"
              />
            </div>
            <div v-else class="flex h-full flex-col">
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
                id="locker-list"
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
                    :key="station.key"
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
        </UTabs>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  close: Κλείσιμο
</i18n>
