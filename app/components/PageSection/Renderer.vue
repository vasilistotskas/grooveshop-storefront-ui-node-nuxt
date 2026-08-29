<script lang="ts" setup>
const props = defineProps<{ section: PageSection }>()

const tenantStore = useTenantStore()

const component = computed(() =>
  resolveSectionComponent(props.section.componentType, tenantStore.schemaName),
)

// section.props is already validated and unknown keys STRIPPED by the
// page-config server route (server/utils/pageSectionProps.ts) — the
// single producer of PageSection data. Any new producer of sections
// MUST route its admin-authored props through parseSectionProps before
// they reach this v-bind; validating here would put zod back into the
// client's eager graph. The cast mirrors parseSectionProps's output
// type (the generated PageSection.props is `unknown`).
const parsedProps = computed(
  () => (props.section.props ?? {}) as Record<string, unknown>,
)
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
