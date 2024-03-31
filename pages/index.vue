<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const { isMobileOrTablet } = useDevice()
</script>

<template>
  <div class="container-fluid relative !p-0">
    <PageBody>
      <PageSection>
        <div
          class="gap-4 pt-4"
          :class="{
            grid: isMobileOrTablet,
            flex: !isMobileOrTablet,
          }"
        >
          <BlogCategoriesSlider
            v-if="isMobileOrTablet"
            class="container-sm !pr-0"
          />
          <BlogSidebar v-else />
          <BlogPostsList
            :class="isMobileOrTablet ? 'container-sm' : 'container-sm'"
            pagination-type="cursor"
            :show-ordering="false"
            :page-size="6"
          />
        </div>
      </PageSection>
    </PageBody>
  </div>
</template>
