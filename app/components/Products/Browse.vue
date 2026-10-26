<script lang="ts" setup>
/**
 * A listing's body: the filter column beside the results on a wide
 * screen; on a narrow one the filters move into a drawer the toolbar
 * opens. The store-wide listing and every category page share it, in
 * the scope their page provides (`provideListingScope`). The column is
 * sticky, so it `self-start`s: stretched to the grid row it would have no
 * room to follow the page.
 */
const { categoryId } = useListingScope()

const sidebar = ref<{ toggleDrawer: () => void } | null>(null)
const totalResults = ref(0)
</script>

<template>
  <div class="grid gap-x-12 lg:grid-cols-[17rem_minmax(0,1fr)]">
    <ProductsSidebar
      ref="sidebar"
      class="lg:self-start"
      :total-results="totalResults"
    />
    <ProductsList
      id="product-results"
      :category-id="categoryId"
      @toggle-filters="sidebar?.toggleDrawer()"
      @update:total-results="(total: number) => { totalResults = total }"
    />
  </div>
</template>
