<script lang="ts" setup>
const { t } = useI18n()

const breadcrumb = computed(() => [
  { label: t('breadcrumb.blog'), to: '/blog' },
  { label: t('title') },
])

useHead({
  // seo.title, not title: `title` is also the page's h1 (see /blog).
  title: t('seo.title'),
})

// Without one this page fell back to the site-wide description, which is
// the same 62 characters on every static page.
useSeoMeta({
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
})
</script>

<template>
  <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
    <PageBreadcrumb :items="breadcrumb" />

    <header class="flex flex-col gap-2">
      <h1
        class="
          font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[2.25rem]/[1.1]
        "
      >
        {{ t('title') }}
      </h1>
      <p class="max-w-prose text-toned">
        {{ t('lead') }}
      </p>
    </header>

    <BlogCategoriesList class="w-full" />
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορίες
  lead: Τα άρθρα και οι οδηγοί μας, ανά θέμα.
  breadcrumb:
    blog: Blog
  seo:
    title: Κατηγορίες άρθρων και οδηγών
    description: Περιήγηση στις κατηγορίες του blog — βρες γρήγορα τα άρθρα και τους οδηγούς που σε ενδιαφέρουν, ταξινομημένα ανά θέμα.
en:
  title: Categories
  lead: Our articles and guides, by subject.
  breadcrumb:
    blog: Blog
  seo:
    title: Article and guide categories
    description: Browse the blog categories — find the articles and guides you are looking for, sorted by subject.
</i18n>
