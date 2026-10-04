<script lang="ts" setup>
/**
 * The checkout's progress, as the boards draw it: four items over the
 * three pages — Details, Delivery, Payment and Review — each a bar that
 * fills once reached, numbered, and ticked once done. Review has no page
 * of its own: it shares the payment page and lights once a payment
 * method is chosen there (PLAN D10).
 *
 * A done step can be revisited and the next one asked for; the page
 * decides (`select` carries the PAGE index), so the per-step validation
 * still gates every forward move.
 */
const props = defineProps<{
  /** The page on screen: 0 details, 1 delivery, 2 payment. */
  current: number
  /** Whether a payment method is chosen — lights Review. */
  paymentChosen: boolean
}>()

const emit = defineEmits<{
  select: [page: number]
}>()

const { t } = useI18n()

const items = computed(() => {
  const reviewReached = props.current === 2 && props.paymentChosen
  return [
    { key: 'details', page: 0, reached: true, done: props.current > 0 },
    { key: 'delivery', page: 1, reached: props.current >= 1, done: props.current > 1 },
    { key: 'payment', page: 2, reached: props.current >= 2, done: reviewReached },
    { key: 'review', page: 2, reached: reviewReached, done: false },
  ].map((item, index) => ({
    ...item,
    number: index + 1,
    // A done step, or the very next page, can be asked for; Review is the
    // payment page itself.
    selectable: item.key !== 'review' && item.page !== props.current && item.page <= props.current + 1,
    current: item.key !== 'review' && item.page === props.current,
  }))
})
</script>

<template>
  <nav :aria-label="t('label')">
    <ol class="grid grid-cols-4 gap-2 sm:gap-3">
      <li
        v-for="item in items"
        :key="item.key"
      >
        <component
          :is="item.selectable ? 'button' : 'div'"
          :type="item.selectable ? 'button' : undefined"
          :aria-current="item.current ? 'step' : undefined"
          :class="[
            'flex w-full flex-col gap-2 text-start',
            item.selectable && 'cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
          ]"
          @click="item.selectable ? emit('select', item.page) : undefined"
        >
          <span
            aria-hidden="true"
            :class="['h-1 rounded-full', item.reached ? 'bg-secondary' : 'bg-accented']"
          />
          <span
            :class="[
              'flex items-center gap-1.5 text-xs sm:text-sm',
              item.reached ? 'font-semibold text-highlighted' : 'text-toned',
            ]"
          >
            <UIcon
              v-if="item.done"
              name="i-lucide-check"
              class="size-3.5 shrink-0 text-accent"
            />
            <span
              v-else
              class="font-mono"
            >{{ item.number }}</span>
            <span class="truncate">{{ t(item.key) }}</span>
            <span
              v-if="item.done"
              class="sr-only"
            >{{ t('done') }}</span>
          </span>
        </component>
      </li>
    </ol>
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Βήματα ολοκλήρωσης
  details: Στοιχεία
  delivery: Αποστολή
  payment: Πληρωμή
  review: Έλεγχος
  done: " (ολοκληρώθηκε)"
en:
  label: Checkout steps
  details: Details
  delivery: Delivery
  payment: Payment
  review: Review
  done: " (done)"
</i18n>
