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
  <!-- No wrapper element: the section component owns its own root.
       A <section> here always rendered once the component RESOLVED,
       whether or not that component rendered anything — so an empty
       band (recently_viewed with no history, i.e. every first-time
       visitor) became a real grid item on the homepage and contributed
       a full gap of blank space. Components that render nothing produce
       a comment node instead, which is what the pre-builder pages did.
       The wrapper carried no classes and nothing styles it. -->
  <component
    :is="component"
    v-if="component"
    :title="section.title"
    v-bind="parsedProps"
  />
</template>
