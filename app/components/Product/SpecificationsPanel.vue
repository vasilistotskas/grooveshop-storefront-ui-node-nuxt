<script lang="ts" setup>
/**
 * The product's specifications as a two-column table: what is measured
 * and its value, one ruled row each. Shared by the product page's
 * description tab (beside the text), its specifications tab and the
 * phone's accordion.
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
  <table
    v-if="specifications.length > 0"
    class="w-full border-collapse text-sm"
  >
    <tbody>
      <tr
        v-for="spec in specifications"
        :key="spec.label"
        class="border-b border-default"
      >
        <th
          scope="row"
          class="w-2/5 px-4 py-3.5 text-start font-semibold text-muted"
        >
          {{ spec.label }}
        </th>
        <td class="px-4 py-3.5 font-semibold text-highlighted">
          {{ spec.value }}
        </td>
      </tr>
    </tbody>
  </table>
  <p
    v-else
    class="text-muted"
  >
    {{ t('no_specifications_available') }}
  </p>
</template>

<i18n lang="yaml">
el:
  no_specifications_available: Δεν υπάρχουν διαθέσιμες προδιαγραφές
en:
  no_specifications_available: No specifications available
</i18n>
