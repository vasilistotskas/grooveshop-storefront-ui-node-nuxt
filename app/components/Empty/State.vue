<script lang="ts" setup>
defineProps({
  title: {
    type: String,
    required: false,
    default: 'common.empty.title',
  },
  description: {
    type: String,
    required: false,
    default: '',
  },
  icon: {
    type: Object,
    required: false,
    default: null,
  },
})

defineSlots<{
  actions(props: object): any
}>()
</script>

<template>
  <div
    class="
      empty-state text-primary-950 flex flex-col items-center justify-center
      gap-4 rounded-lg border border-primary-500 p-4 text-center

      dark:text-primary-50 dark:border-primary-500

      md:p-8
    "
  >
    <div
      v-if="icon"
      class="empty-state-icon"
    >
      <Component :is="icon" />
    </div>
    <div class="empty-state-title text-xl font-semibold">
      {{ $t(title) }}
    </div>
    <div
      v-if="description"
      class="empty-state-description text-sm"
    >
      {{ $t(description) }}
    </div>
    <slot name="actions" />
  </div>
</template>
