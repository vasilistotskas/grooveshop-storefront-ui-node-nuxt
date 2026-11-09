<script lang="ts" setup>
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const tenantStore = useTenantStore()

const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

// Per-tenant homepage composition: the store's published `home` page drives
// which sections render in which order. A new store gets the platform's
// default home as its first release, so there is no code-level layout here.
const { sections, heading } = await useBuilderPage('home')

// The page's h1: the heading the store wrote for its homepage, or its name.
const pageHeading = computed(() => heading.value || appTitle.value)

useHead({
  titleTemplate: '%s',
})

useSeoMeta({
  titleTemplate: '%s',
  title: () => appTitle.value,
  description: () => siteConfig.description,
  ogTitle: () => appTitle.value,
  ogDescription: () => siteConfig.description,
  // og:url deliberately NOT set here — setupPageHeader already emits
  // the tenant-aware `${siteConfig.url}${route.path}`; overriding it
  // with the env-frozen platform baseUrl made every tenant's homepage
  // unfurl as tenant #1's site.
  ogType: 'website',
})
</script>

<template>
  <PageSectionsShell :sections="sections">
    <template #title>
      <!-- Every page owns exactly one h1. The homepage's is the heading
           the store set in the editor's page settings, or else its name.
           Visually hidden: the hero sections own the visible top of the
           page. -->
      <PageTitle
        v-if="!sectionsProvideHeading(sections)"
        :text="pageHeading"
        class="sr-only"
      />
    </template>
  </PageSectionsShell>
</template>
