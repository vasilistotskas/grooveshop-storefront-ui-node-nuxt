<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const breadcrumb = computed(() => [{ label: t('breadcrumb.items.blog.label') }])

useSeoMeta({
  description: t('description'),
  ogDescription: t('description'),
})
useHead({
  // seo.title, not title: `title` is also the page's h1, where the bare
  // word reads correctly. Only the document title needs the qualifier.
  title: t('seo.title'),
})

// Optional per-tenant branded band above the page content — sections
// from the published 'blog' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('blog')

// The search lives in the URL like the filters do, so a result page can
// be shared and the back button undoes it.
const term = ref(String(route.query.search ?? ''))
watch(() => route.query.search, (value) => {
  term.value = String(value ?? '')
})

const onSearch = async () => {
  const value = term.value.trim()
  await router.push(localePath({
    path: route.path,
    query: { ...route.query, search: value || undefined, page: undefined },
  }))
}
</script>

<template>
  <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
    <PageBreadcrumb :items="breadcrumb" />

    <!-- Breadcrumb ABOVE the branded band (crumb landed mid-page for
         tenants with published sections). -->
    <div
      v-if="brandSections.length"
      class="
        grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in brandSections"
        :key="section.uuid"
        :section="section"
      />
    </div>

    <header class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div class="flex min-w-0 flex-col gap-2">
        <h1
          v-if="!sectionsProvideHeading(brandSections)"
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
      </div>

      <form
        role="search"
        class="w-full sm:w-72"
        @submit.prevent="onSearch"
      >
        <UInput
          v-model="term"
          type="search"
          icon="i-lucide-search"
          :placeholder="t('search.placeholder')"
          :aria-label="t('search.label')"
          size="lg"
          class="w-full"
        />
      </form>
    </header>

    <BlogPostsList />
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Blog
  lead: Άρθρα και οδηγοί από την ομάδα μας — πρακτικές συμβουλές, αναλύσεις και απαντήσεις στις πιο συχνές απορίες.
  search:
    label: Αναζήτηση στα άρθρα
    placeholder: Αναζήτηση άρθρων
  seo:
    # Tenant-NEUTRAL: this string ships to every storefront. "τεχνολογίας"
    # would advertise tenant #1's subject matter on a natural-products
    # shop (same class of leak as the old brand links in useFooterLinks).
    title: "Blog: Άρθρα, νέα και οδηγοί"
  # Tenant-NEUTRAL, like seo.title above: no product domain named.
  description: Άρθρα, οδηγοί και νέα από την ομάδα μας — πρακτικές συμβουλές, αναλύσεις και απαντήσεις στις πιο συχνές απορίες.
  breadcrumb:
    items:
      blog:
        label: Blog
en:
  title: Blog
  lead: Articles and guides from our team — practical advice, analysis and answers to the questions we are asked most.
  search:
    label: Search the articles
    placeholder: Search articles
  seo:
    title: "Blog: articles, news and guides"
  description: Articles, guides and news from our team — practical advice, analysis and answers to the questions we are asked most.
  breadcrumb:
    items:
      blog:
        label: Blog
</i18n>
