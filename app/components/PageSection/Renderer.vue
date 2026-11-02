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

// On the editor's preview each section is wrapped in an element that
// carries its node id, so a click selects it there and the editor can
// outline it (`app/builder/canvas/bridge.ts`). The wrapper is
// `display: contents`, no box of its own, so the page's grid and gaps are
// the store's, and the attribute does not depend on a design passing
// attributes through to its root. Off the canvas there is no wrapper.
const onCanvas = useBuilderSurface() === 'canvas'
const canvasMark = { [BUILDER_CANVAS_NODE_ATTRIBUTE]: props.section.id }

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
       The wrapper carried no classes and nothing styles it. The canvas
       wrapper below is `display: contents` and exists only there. -->
  <div
    v-if="component && onCanvas"
    v-bind="canvasMark"
    class="contents"
  >
    <component
      :is="component"
      v-bind="section.props"
    />
  </div>
  <component
    :is="component"
    v-else-if="component"
    v-bind="section.props"
  />
</template>
