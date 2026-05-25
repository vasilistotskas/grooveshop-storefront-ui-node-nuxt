<script lang="ts" setup>
/**
 * "Did you mean ..." chip under the checkout address grid.
 *
 * Watches the four address fields (street, streetNumber, zipcode,
 * city) — once all four are populated we debounce-call ACS's
 * ``ACS_Address_Validation`` endpoint via our Nuxt proxy.  When ACS
 * returns a different-but-cleaner spelling we show a soft suggestion
 * the shopper can click to apply.
 *
 * UX rules:
 *   • Failures are silent.  ACS being down or unconfigured must
 *     never scare the shopper into thinking their address is wrong.
 *   • The suggestion is only shown when something *meaningful*
 *     differs from what they typed (street, number, or zip).  An
 *     identical match would be noise.
 *   • The chip appears below the address grid, so a watcher inside
 *     the form's natural reading flow doesn't break tab-order.
 */

const formState = defineModel<Record<string, any>>('formState', {
  required: true,
})

const props = defineProps<{
  /**
   * Master switch — set to false to suppress validation entirely
   * (for example outside Greece, or when ACS is the disabled
   * provider).  Defaults true so callers that don't bother to pass
   * the flag still get the experience.
   */
  enabled?: boolean
}>()

const { t } = useI18n()
const { resolved, isLoading, validate, cancel } = useAcsAddressValidation()

// Concatenate the four fields the user has typed into a free-text
// string for ACS's parser.  Empty fields collapse — the composable
// short-circuits on strings shorter than 5 chars so no API call
// fires for half-filled forms.
const currentAddress = computed(() => {
  const parts = [
    formState.value.street,
    formState.value.streetNumber,
    formState.value.zipcode,
    formState.value.city,
  ]
  return parts.filter(Boolean).join(' ').trim()
})

const isAllFilled = computed(
  () =>
    Boolean(formState.value.street)
    && Boolean(formState.value.streetNumber)
    && Boolean(formState.value.zipcode)
    && Boolean(formState.value.city),
)

watch(
  [currentAddress, () => props.enabled, isAllFilled],
  ([address, enabled, allFilled]) => {
    if (!enabled || !allFilled) {
      cancel()
      return
    }
    validate(address)
  },
  { immediate: true },
)

onUnmounted(() => cancel())

// "Different enough to suggest" — we don't surface the chip when
// the resolved values match what the user already typed.  Compares
// stripped + uppercased so a Greek/Latin punctuation difference
// doesn't look like a real change.
const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

const hasSuggestion = computed(() => {
  const r = resolved.value
  if (!r) return false
  const streetDiffers
    = normalize(r.resolvedStreet)
      && normalize(r.resolvedStreet) !== normalize(formState.value.street)
  const zipDiffers
    = normalize(r.resolvedZip)
      && normalize(r.resolvedZip) !== normalize(formState.value.zipcode)
  const numberDiffers
    = normalize(r.resolvedStreetNum)
      && normalize(r.resolvedStreetNum)
      !== normalize(formState.value.streetNumber)
  return Boolean(streetDiffers || zipDiffers || numberDiffers)
})

const suggestionLine = computed(() => {
  const r = resolved.value
  if (!r) return ''
  const street = [r.resolvedStreet, r.resolvedStreetNum]
    .filter(Boolean)
    .join(' ')
  const cityLine = [r.resolvedZip, r.resolvedArea].filter(Boolean).join(' ')
  return [street, cityLine].filter(Boolean).join(', ')
})

function applySuggestion() {
  const r = resolved.value
  if (!r) return

  // Visible form fields the shopper sees populate.
  if (r.resolvedStreet) formState.value.street = r.resolvedStreet
  if (r.resolvedStreetNum) {
    formState.value.streetNumber = r.resolvedStreetNum
  }
  if (r.resolvedZip) formState.value.zipcode = r.resolvedZip
  // ACS's ``resolvedArea`` is the area/neighborhood label ("Περιοχή"),
  // not the city ("Πόλη"). The checkout no longer collects a separate
  // area field, so ``resolvedArea`` is intentionally not applied —
  // ``city`` is left to whatever the shopper entered.

  // Stash the ACS routing metadata on form state. It's not surfaced
  // in any visible input — Greek περιφέρειες (the modern region
  // selector) don't 1:1 map to ACS's nomos-based ``resolvedProvidence``,
  // and lat/long + geoId + stationId + branchId aren't address fields
  // — they're routing hints. Forwarded to the backend on order create
  // so ACS_Create_Voucher can consume them directly without
  // re-running ``ACS_Address_Validation`` server-side.
  formState.value.acsResolvedAddress = {
    geoId: r.geoId ?? null,
    lat: r.resolvedLat ?? null,
    lng: r.resolvedLong ?? null,
    stationId: r.resolvedStationId || null,
    branchId: r.resolvedBranchId ?? null,
    providence: r.resolvedProvidence || null,
    addressId: r.addressId || null,
  }
}
</script>

<template>
  <UAlert
    v-if="hasSuggestion"
    color="info"
    variant="subtle"
    icon="i-lucide-map-pin-check"
    :title="t('shipping.acs.address_suggestion.title')"
    :description="suggestionLine"
    :ui="{ wrapper: 'flex items-start gap-3' }"
  >
    <template #actions>
      <UButton
        size="sm"
        variant="solid"
        color="info"
        icon="i-lucide-check"
        @click="applySuggestion"
      >
        {{ t('shipping.acs.address_suggestion.apply') }}
      </UButton>
    </template>
  </UAlert>

  <!-- Loading sentinel — only renders when the watcher actually
       fired (all four fields filled).  Kept tiny so it doesn't
       distract from the form. -->
  <p
    v-else-if="isLoading && isAllFilled"
    class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"
  >
    <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
    {{ t('shipping.acs.address_suggestion.checking') }}
  </p>
</template>
