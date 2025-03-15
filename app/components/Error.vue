<script lang="ts" setup>
import type { PropType } from 'vue'
import type { IFetchError } from 'ofetch'

const { t } = useI18n({ useScope: 'local' })
const { enabled } = useAuthPreviewMode()

defineProps({
  error: {
    type: Object as PropType<IFetchError>,
    required: false,
    default: undefined,
  },
})
</script>

<template>
  <UCard
    class="
      relative grid w-full place-content-center place-items-center
      place-self-center
    "
  >
    <div
      class="flex items-center gap-2"
    >
      <span
        class="
          text-lg font-semibold text-neutral-700

          dark:text-neutral-200
        "
      >
        {{ t('error') }}
        <span v-if="enabled">({{ error?.statusMessage }})</span>
      </span>
      <UIcon
        name="i-heroicons-exclamation-circle" class="h-6 w-6 text-red-500"
      />
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  error: Παρουσιάστηκε σφάλμα, δοκίμασε αργότερα.
</i18n>
