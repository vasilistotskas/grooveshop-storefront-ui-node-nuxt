<script lang="ts" setup>
const colorMode = useColorMode()
const { $i18n } = useNuxtApp()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  },
})

const modes = [
  {
    icon: 'i-heroicons-moon-20-solid',
    mode: 'dark',
  },
  {
    icon: 'i-heroicons-sun-20-solid',
    mode: 'light',
  },
] as const

const mode = computed(() => colorMode.preference)
const icon = computed(() => colorMode.value === 'dark' ? modes[0].icon : modes[1].icon)
</script>

<template>
  <ClientOnly>
    <UButton
      type="button"
      size="xl"
      class="p-0"
      color="neutral"
      variant="ghost"
      :title="$i18n.t('theme')"
      :aria-label="$i18n.t('theme')"
      :aria-pressed="colorMode.preference === mode ? 'true' : 'false'"
      :icon="icon"
      :ui="{
        base: 'cursor-pointer hover:bg-transparent',
      }"
      @click="isDark = !isDark"
    />
    <template #fallback>
      <USkeleton
        class="h-6 w-6"
      />
    </template>
  </ClientOnly>
</template>
