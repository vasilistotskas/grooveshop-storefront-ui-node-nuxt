<script setup lang="ts">
const modelValue = defineModel<any>(
  'modelValue',
  { default: null },
)

const emit = defineEmits(['close'])

const { locale } = useI18n()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

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
    :color="'primary'"
    :attributes="attrs"
    :is-dark="isDark"
    :first-day-of-week="2"
    title-position="left"
    :locale="locale"
    trim-weeks
  />
</template>
