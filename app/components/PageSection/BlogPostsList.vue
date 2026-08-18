<script lang="ts" setup>
const props = defineProps<{
  title?: string
  pageSize?: number
}>()

const tenantStore = useTenantStore()
const { isMobileOrTablet } = useDevice()

// Mobile shows 6 articles up front (2 columns of 3 cards on tablet,
// single column on phone) and a Load more button. Desktop ships 9 (a
// clean 3x3 grid at xl) so the rail looks balanced before the user has
// to ask for more.
const effectivePageSize = computed(
  () => props.pageSize ?? (isMobileOrTablet.value ? 6 : 9),
)
</script>

<template>
  <LazyBlogPostsList
    v-if="tenantStore.blogEnabled"
    :page-size="effectivePageSize"
    :show-ordering="false"
    :eager-first-images="false"
    class="
      mx-auto max-w-main
      md:p-0!
    "
    pagination-type="cursor"
    pagination-strategy="button"
    hydrate-on-visible
  />
</template>
