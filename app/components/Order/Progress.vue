<script lang="ts" setup>
/**
 * How far an order has come, as the boards draw it: one segment per step
 * of `ORDER_FLOW`, filled up to the status reached. With `labels`, each
 * step is named under its segment (the order page) — on a phone, where
 * five Greek step names do not fit under five segments, only the step
 * reached is named, under the strip; without, it is the compact strip of
 * the overview's latest-order card.
 *
 * Nothing renders for an order that has left the path (canceled,
 * returned, refunded): a strip stuck part-way would read as "still
 * coming".
 */
const props = defineProps<{
  status?: OrderStatus
  labels?: boolean
}>()

const { t } = useI18n()

const reached = computed(() => orderStepsReached(props.status))
const current = computed(() => ORDER_FLOW[reached.value - 1])
</script>

<template>
  <div
    v-if="reached > 0"
    class="flex flex-col gap-2"
  >
    <ol
      class="grid grid-cols-5 gap-1.5"
      :aria-label="t('label', { reached, total: ORDER_FLOW.length })"
    >
      <li
        v-for="(step, index) in ORDER_FLOW"
        :key="step"
        class="flex flex-col gap-2"
        :aria-current="index + 1 === reached ? 'step' : undefined"
      >
        <span
          class="h-1.5 rounded-full"
          :class="index < reached ? 'bg-secondary' : 'bg-accented'"
        />
        <span
          v-if="labels"
          class="text-xs font-medium max-sm:sr-only"
          :class="index < reached ? 'text-highlighted' : 'text-toned'"
        >
          {{ t(`steps.${step}`) }}
        </span>
      </li>
    </ol>
    <p
      v-if="labels && current"
      class="text-xs font-medium text-highlighted sm:hidden"
      aria-hidden="true"
    >
      {{ t(`steps.${current}`) }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  label: "Βήμα {reached} από {total}"
  steps:
    PENDING: Καταχωρήθηκε
    PROCESSING: Σε επεξεργασία
    SHIPPED: Στάλθηκε
    DELIVERED: Παραδόθηκε
    COMPLETED: Ολοκληρώθηκε
en:
  label: "Step {reached} of {total}"
  steps:
    PENDING: Placed
    PROCESSING: Processing
    SHIPPED: Shipped
    DELIVERED: Delivered
    COMPLETED: Completed
</i18n>
