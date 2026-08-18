<script lang="ts" setup>
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const tenantStore = useTenantStore()

const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

// Per-tenant homepage composition: the published PageLayout ('home')
// drives which sections render in which order; the code-level fallback
// in usePageConfig mirrors the platform homepage exactly for tenants
// (and pre-cutover webside) without a published layout.
const { sections } = usePageConfig('home')

definePageMeta({
  layout: 'default',
})

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
  <PageWrapper>
    <section
      class="
        grid gap-4 pt-4
        md:flex md:flex-col md:gap-8
      "
    >
      <div
        class="
          grid gap-4
          md:gap-8
        "
      >
        <PageSectionRenderer
          v-for="section in sections"
          :key="section.uuid"
          :section="section"
        />
      </div>
    </section>
  </PageWrapper>
</template>
