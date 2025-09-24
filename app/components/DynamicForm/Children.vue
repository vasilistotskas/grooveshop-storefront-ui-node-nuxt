<template>
  <Component
    :is="tag"
    v-for="({ tag, text, ...childAttrs }, idx) in children"
    :key="idx"
    v-bind="childAttrs"
  >
    {{ text }}
  </Component>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  children: {
    type: Array as PropType<DynamicFormSchemaChildren>,
    required: true,
  },
})
</script>
