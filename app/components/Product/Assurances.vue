<script lang="ts" setup>
/**
 * The product page's purchase assurances under the buy button: the rows
 * `useProductAssurances` built (delivery, payment, returns), one line each
 * with an optional note under it. The rows and their wording are the
 * composable's, so both designs say the same things.
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
      flex list-none flex-col divide-y divide-default rounded-[1rem] border
      border-default bg-muted px-4 py-1 text-sm
    "
  >
    <li
      v-for="row in rows"
      :key="row.kind"
      class="flex items-start gap-3 py-3"
    >
      <UIcon
        :name="row.icon"
        class="mt-0.5 size-5 shrink-0 text-toned"
      />
      <span class="flex min-w-0 flex-col">
        <ULink
          v-if="row.to"
          :to="row.to"
          class="
            font-medium text-highlighted
            hover:underline
          "
        >{{ row.text }}</ULink>
        <span
          v-else
          class="font-medium text-highlighted"
        >{{ row.text }}</span>
        <span
          v-if="row.note"
          class="text-xs text-muted"
        >{{ row.note }}</span>
      </span>
    </li>
  </ul>
</template>
