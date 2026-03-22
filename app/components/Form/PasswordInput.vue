<script lang="ts" setup>
const { t } = useI18n()

defineProps<{
  toggleAriaLabel?: string
}>()

const modelValue = defineModel<string>()

const showPassword = ref(false)
</script>

<template>
  <UInput
    v-model="modelValue"
    :type="showPassword ? 'text' : 'password'"
    v-bind="$attrs"
    :ui="{
      root: 'w-full',
      trailing: 'pe-1',
    }"
  >
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
        :aria-label="toggleAriaLabel || (showPassword ? t('password.hide') : t('password.show'))"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      />
    </template>
  </UInput>
</template>

<i18n lang="yaml">
el:
  password:
    show: Δείξε τον κωδικό
    hide: Κρύψε τον κωδικό
</i18n>
