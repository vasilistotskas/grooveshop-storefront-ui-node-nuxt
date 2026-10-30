<script lang="ts" setup>
/**
 * Webside's purchase assurances under the buy button: the rows
 * `useProductAssurances` built, in a dark-blue rounded box with a divider
 * between rows.
 */
defineProps<{
  rows: ProductAssuranceRow[]
  label: string
}>()
</script>

<template>
  <ul
    v-if="rows.length"
    :aria-label="label"
    class="
      flex list-none flex-col divide-y divide-info-200 rounded-xl bg-info-50
      px-4 py-1 text-sm text-info-800
      dark:divide-info-900 dark:bg-info-950 dark:text-info-300
    "
  >
    <li
      v-for="row in rows"
      :key="row.kind"
      class="flex items-start gap-3 py-3"
    >
      <UIcon
        :name="row.icon"
        class="mt-0.5 size-5 shrink-0"
      />
      <span class="flex min-w-0 flex-col">
        <ULink
          v-if="row.to"
          :to="row.to"
          class="hover:underline"
        >{{ row.text }}</ULink>
        <span v-else>{{ row.text }}</span>
        <span
          v-if="row.note"
          class="text-xs"
        >{{ row.note }}</span>
      </span>
    </li>
  </ul>
</template>
