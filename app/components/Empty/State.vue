<script lang="ts" setup>
defineProps({
  title: {
    type: String,
    required: false,
    default: 'Empty',
  },
  description: {
    type: String,
    required: false,
    default: '',
  },
})

defineSlots<{
  actions(props: object): any
  icon(props: object): any
}>()
</script>

<template>
  <div
    class="
      empty-state flex flex-col items-center justify-center gap-4 rounded-lg
      border border-primary-500 p-4 text-center text-primary-950
      md:p-8
      dark:border-primary-500 dark:text-primary-50
    "
  >
    <div class="empty-state-title flex items-center gap-2 text-xl font-semibold">
      <slot name="icon" />
      {{ title }}
    </div>
    <div
      v-if="description"
      class="empty-state-description text-sm"
    >
      {{ description }}
    </div>
    <slot name="actions" />
  </div>
</template>
