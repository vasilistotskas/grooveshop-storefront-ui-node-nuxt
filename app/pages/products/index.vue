<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()

// Ref to control the sidebar drawer
const sidebarRef = ref<{ toggleDrawer: () => void } | null>(null)

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('products'),
    label: t('breadcrumb.items.products.label'),
    current: true,
  },
])

useHead({
  title: t('title'),
})

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'default',
})

// Handle filter toggle from Toolbar
const handleToggleFilters = () => {
  sidebarRef.value?.toggleDrawer()
}
</script>

<template>
  <PageWrapper
    class="flex flex-col"
    :class="[
      'lg:px-0 lg:max-w-375',
      isMobileOrTablet ? 'pb-24' : '',
    ]"
  >
    <!-- Skip Links for Keyboard Navigation -->
    <div class="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        class="
          skip-link
          fixed top-4 left-4 z-50
          bg-primary text-white
          px-4 py-2 rounded-lg
          font-semibold
          transition-all
        "
      >
        {{ t('skip_to_content') }}
      </a>
      <a
        href="#filters"
        class="
          skip-link
          fixed top-4 left-32 z-50
          bg-primary text-white
          px-4 py-2 rounded-lg
          font-semibold
          transition-all
        "
      >
        {{ t('skip_to_filters') }}
      </a>
    </div>

    <div class="container !p-0">
      <UBreadcrumb
        :items="items"
        :ui="{
          item: `
            text-neutral-950
            dark:text-neutral-50
          `,
          root: `
            text-xs
            md:text-base
          `,
        }"
        class="
          mb-6
          md:px-0
        "
      />
    </div>

    <div
      class="flex gap-6"
      :class="{
        'flex-col': isMobileOrTablet,
        'flex-row': !isMobileOrTablet,
      }"
    >
      <ProductsSidebar id="filters" ref="sidebarRef" />
      <ProductsList id="main-content" @toggle-filters="handleToggleFilters" />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προϊόντα
  skip_to_content: Μετάβαση στο περιεχόμενο
  skip_to_filters: Μετάβαση στα φίλτρα
  breadcrumb:
    items:
      index:
        label: Αρχική
        icon: i-heroicons-home
      products:
        label: Προϊόντα
</i18n>
