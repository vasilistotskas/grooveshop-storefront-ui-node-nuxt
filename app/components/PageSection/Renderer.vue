<script lang="ts" setup>
// parseSectionProps comes from shared/ auto-imports — a relative import
// into shared/ breaks Nitro's server-bundle resolution in production
// builds (rollup resolves it from the .nuxt cache dir, not the source).
const props = defineProps<{ section: PageSection }>()

const tenantStore = useTenantStore()

const component = computed(() =>
  resolveSectionComponent(props.section.componentType, tenantStore.schemaName),
)

// Admin-authored JSON is validated per componentType and unknown keys
// are STRIPPED before v-bind — layout data can never inject arbitrary
// props/class/style into a section component. Invalid props degrade to
// the component defaults with a warn log instead of breaking the page.
const parsedProps = computed(() => {
  const { props: safeProps, error } = parseSectionProps(
    props.section.componentType,
    props.section.props,
  )
  if (error) {
    log.warn({
      tag: 'page-section',
      message: 'invalid section props — component defaults used',
      componentType: props.section.componentType,
      error,
    })
  }
  return safeProps
})
</script>

<template>
  <section v-if="component">
    <component
      :is="component"
      :title="section.title"
      v-bind="parsedProps"
    />
  </section>
</template>
