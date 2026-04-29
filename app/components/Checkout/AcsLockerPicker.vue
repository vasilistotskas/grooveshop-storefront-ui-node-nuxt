<script lang="ts" setup>
/**
 * Server-side ACS Smartpoint locker picker.
 *
 * Unlike BoxNow there is no iframe widget — the catalogue lives in
 * Django's ``AcsStation`` cache, synced nightly from
 * ``Acs_Stations``.  The user types a postcode (auto-pre-filled from
 * the checkout address) and we list the matching active lockers; a
 * click ``selected``-emits the chosen ``AcsStation`` row back up to
 * the parent.
 */
import type { AcsStation } from '#shared/openapi/types.gen'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  /** Pre-fill postcode from the checkout shipping address. */
  initialPostalCode?: string
  /** Optional fallback city name when the postcode lookup misses. */
  initialCity?: string
}>()

const emit = defineEmits<{
  selected: [station: AcsStation]
}>()

// Composables
const { t } = useI18n()
const { stations, isLoading, errorMessage, search, cancel }
  = useAcsStationSearch()

// Local state
const postalInput = ref('')
const cityInput = ref('')

// Initial population — runs every time the modal opens so a
// previously dismissed picker re-runs the search with the fresh
// checkout postcode (the user might have edited it in step 1).
watch(open, (isOpen) => {
  if (isOpen) {
    postalInput.value = (props.initialPostalCode ?? '').trim()
    cityInput.value = (props.initialCity ?? '').trim()
    if (postalInput.value) {
      search(postalInput.value, cityInput.value, { debounceMs: 0 })
    }
  }
  else {
    cancel()
  }
})

watch([postalInput, cityInput], ([nextPostal, nextCity]) => {
  if (!open.value) return
  search(nextPostal, nextCity)
})

function selectStation(station: AcsStation) {
  emit('selected', station)
  open.value = false
}

onUnmounted(() => cancel())
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('shipping.acs.modal_title')"
    fullscreen
  >
    <template #body>
      <div class="flex h-full flex-col gap-4">
        <!-- Search row -->
        <div class="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <UFormField
            :label="t('shipping.acs.postal_code')"
            name="postalCode"
          >
            <UInput
              v-model="postalInput"
              :placeholder="t('shipping.acs.postal_code_placeholder')"
              size="lg"
              icon="i-lucide-search"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('shipping.acs.city')"
            name="city"
          >
            <UInput
              v-model="cityInput"
              :placeholder="t('shipping.acs.city_placeholder')"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Loading skeleton -->
        <div v-if="isLoading" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-20 w-full" />
        </div>

        <!-- Error state -->
        <UAlert
          v-else-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :title="t('shipping.acs.search_error')"
          :description="errorMessage"
        />

        <!-- Empty state -->
        <UAlert
          v-else-if="!stations.length && postalInput.length >= 3"
          color="neutral"
          variant="subtle"
          icon="i-lucide-package-x"
          :title="t('shipping.acs.empty_title')"
          :description="t('shipping.acs.empty_description')"
        />

        <!-- Result list -->
        <ul v-else-if="stations.length" class="space-y-2 overflow-y-auto pr-1">
          <li
            v-for="station in stations"
            :key="station.externalId"
          >
            <UCard
              class="cursor-pointer transition hover:border-primary"
              variant="outline"
              @click="selectStation(station)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-lucide-map-pin"
                      class="size-4 shrink-0 text-primary"
                    />
                    <span class="font-semibold">{{ station.name }}</span>
                  </div>
                  <p class="text-sm text-neutral-600 dark:text-neutral-200">
                    {{ station.addressLine1 }}, {{ station.postalCode }}
                  </p>
                  <p v-if="station.city" class="text-xs text-muted">
                    {{ station.city }}
                  </p>
                </div>
                <UButton
                  size="sm"
                  variant="soft"
                  icon="i-lucide-check"
                  @click.stop="selectStation(station)"
                >
                  {{ t('shipping.acs.select') }}
                </UButton>
              </div>
            </UCard>
          </li>
        </ul>

        <!-- Initial idle state -->
        <UAlert
          v-else
          color="info"
          variant="subtle"
          icon="i-lucide-search"
          :title="t('shipping.acs.idle_title')"
          :description="t('shipping.acs.idle_description')"
        />
      </div>
    </template>
  </UModal>
</template>
