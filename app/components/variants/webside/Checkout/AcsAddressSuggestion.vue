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
const { isLoading, hasSuggestion, suggestionLine, isAllFilled, applySuggestion } = useAcsAddressSuggestion({
  formState,
  enabled: () => props.enabled,
})
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
