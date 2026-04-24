<script lang="ts" setup>
/**
 * Product specifications panel — shared between PDP tabs (desktop)
 * and accordion (mobile).
 */

interface Specification {
  label: string
  value: string | number
}

defineProps<{
  specifications: Specification[]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="py-4">
    <dl v-if="specifications.length > 0" class="space-y-3">
      <div
        v-for="spec in specifications"
        :key="spec.label"
        class="
          flex items-center justify-between rounded-lg border
          border-gray-200 p-4
          dark:border-gray-700
        "
      >
        <dt class="flex items-center">
          <span class="font-medium">{{ spec.label }}</span>
        </dt>
        <dd class="text-gray-600 dark:text-gray-200">
          {{ spec.value }}
        </dd>
      </div>
    </dl>
    <p
      v-else
      class="text-gray-500 dark:text-gray-200"
    >
      {{ t('no_specifications_available') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  no_specifications_available: Δεν υπάρχουν διαθέσιμες προδιαγραφές
</i18n>
