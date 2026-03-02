<script lang="ts" setup>
const props = defineProps<{
  title?: string
  height?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const heightClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
  }
  return map[props.height ?? 'md']
})
</script>

<template>
  <div
    :class="heightClass"
    aria-hidden="true"
  />
</template>
