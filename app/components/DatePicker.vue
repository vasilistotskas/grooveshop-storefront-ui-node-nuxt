<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar'
import 'v-calendar/dist/style.css'
// @ts-ignore
import type { DatePickerDate, DatePickerRangeObject } from 'v-calendar/dist/types/src/use/datePicker'

const model = defineModel<DatePickerDate | DatePickerRangeObject | null>()

const emit = defineEmits(['close'])

const { locale } = useI18n()

const date = computed({
  get: () => model.value,
  set: (value) => {
    if (value instanceof Date) {
      value.setHours(12, 0, 0, 0)
    }
    model.value = value
    emit('close')
  },
})

const isRange = (value: DatePickerDate | DatePickerRangeObject | null): value is DatePickerRangeObject => {
  return (
    value !== null
    && typeof value === 'object'
    && 'start' in value
    && 'end' in value
    && value.start instanceof Date
    && value.end instanceof Date
  )
}

const isDateRange = computed(() => isRange(date.value))

const attrs = reactive({
  'transparent': true,
  'borderless': true,
  'color': 'primary',
  'is-dark': { selector: 'html', darkClass: 'dark' },
  'first-day-of-week': 2,
  'locale': locale.value,
  'is-range': isDateRange.value,
  'mode': 'date',
})
</script>

<template>
  <VCalendarDatePicker
    v-if="date && isDateRange"
    v-model.range="date"
    :columns="2"
    v-bind="{ ...attrs, ...$attrs }"
    @dayclick="
      (_, event) => {
        event.target.blur();
      }
    "
  />
  <VCalendarDatePicker
    v-else
    v-model="date"
    v-bind="{ ...attrs, ...$attrs }"
    @dayclick="
      (_, event) => {
        event.target.blur();
      }
    "
  />
</template>
