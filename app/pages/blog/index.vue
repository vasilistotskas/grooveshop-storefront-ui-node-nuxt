<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('blog'),
    label: t('breadcrumb.items.blog.label'),
    current: true,
  },
])

useSeoMeta({
  description: t('description'),
  ogDescription: t('description'),
})
useHead({
  // seo.title, not title: `title` is also the page's h1, where the bare
  // word reads correctly. Only the document title needs the qualifier.
  title: t('seo.title'),
})

definePageMeta({
  layout: 'default',
  middleware: ['blog-enabled'],
})

// Optional per-tenant branded band above the page content — sections
// from the published 'blog' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('blog')
</script>

<template>
  <PageWrapper class="flex flex-col">
    <!-- Every page owns exactly one h1. This one is visually hidden
         because the design has no heading slot here — the navbar logo
         used to supply the h1, which put the store name in the h1 of
         several unrelated URLs. -->
    <PageTitle
      v-if="!sectionsProvideHeading(brandSections)"
      :text="t('title')"
      class="sr-only"
    />
    <!-- Breadcrumb ABOVE the branded band (crumb landed mid-page for
         tenants with published sections). -->
    <UBreadcrumb
      :items="items"
      :ui="{
        item: `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
      }"
      class="mb-5"
    />
    <div
      v-if="brandSections.length"
      class="
        mb-8 grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in brandSections"
        :key="section.uuid"
        :section="section"
      />
    </div>
    <BlogPostsList>
      <template #sidebar>
        <BlogTagsList />
      </template>
    </BlogPostsList>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Blog
  seo:
    # Tenant-NEUTRAL: this string ships to every storefront. "τεχνολογίας"
    # would advertise tenant #1's subject matter on a natural-products
    # shop (same class of leak as the old brand links in useFooterLinks).
    title: "Blog: Άρθρα, νέα και οδηγοί"
  description: Νέα, άρθρα και ιστορίες μας.
  breadcrumb:
    items:
      blog:
        label: Blog
</i18n>
