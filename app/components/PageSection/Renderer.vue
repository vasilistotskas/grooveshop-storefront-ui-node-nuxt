<script lang="ts" setup>
const props = defineProps<{ section: PageSection }>()

const component = computed(() => componentRegistry[props.section.componentType])
</script>

<template>
  <section v-if="component">
    <component
      :is="component"
      :title="section.title"
      v-bind="section.props"
    />
  </section>
</template>
