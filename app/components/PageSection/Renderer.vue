<script lang="ts" setup>
const props = withDefaults(defineProps<{
  section: BuilderSection
  /** Where the page is drawn; a hero hints its image as the LCP only when it leads the page. */
  placement?: PageSectionPlacement
}>(), { placement: 'top' })

providePageSectionPlacement(props.placement)

const tenantStore = useTenantStore()

const component = computed(() =>
  resolveSectionComponent(props.section.componentType, tenantStore.schemaName),
)

// section.props is already validated and unknown keys STRIPPED by the
// builder page route (`server/api/builder/pages/[pageKey].get.ts`, through
// `parseDocument` and `sectionProps`), the single producer of section data,
// so it is bound as it is. Validating here would put zod back into the
// client's eager graph.
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
    v-bind="section.props"
  />
</template>
