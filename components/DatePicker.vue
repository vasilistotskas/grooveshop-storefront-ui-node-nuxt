<script setup lang="ts">
const modelValue = defineModel<Date | null>('modelValue', { default: null })

const emit = defineEmits(['close'])

const { locale } = useI18n()

const themeCookie = useCookie('theme')
const isDark = computed(() => themeCookie.value === 'dark')

const date = computed({
  get: () => modelValue.value,
  set: (value) => {
    modelValue.value = value
    emit('close')
  },
})

const attrs = [
  {
    key: 'today',
    dates: new Date(),
    highlight: true,
  },
]
</script>

<template>
  <VDatePicker
    v-model="date"
    transparent
    borderless
    :attributes="attrs"
    :is-dark="isDark"
    :locale="locale"
    title-position="left"
    trim-weeks
    :first-day-of-week="2"
    :color="'blue'"
  />
</template>
