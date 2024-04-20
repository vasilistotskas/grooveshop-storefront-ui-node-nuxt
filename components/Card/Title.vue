<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    default: '',
  },
})
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div class="mb-2 text-xl font-semibold">
    <p
      class="
        text-primary-950

        dark:text-primary-50
      "
    >
      <slot>
        {{ text }}
      </slot>
    </p>
  </div>
</template>
