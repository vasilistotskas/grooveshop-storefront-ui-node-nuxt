<script lang="ts" setup>
/**
 * Federated Search Page
 *
 * A dedicated page for federated search that uses the FederatedSearchBar component.
 * This page demonstrates the unified search experience across products and blog posts
 * with weighted ranking and federation metadata.
 *
 * Validates Requirements: 5.4, 5.5
 */
definePageMeta({
  layout: 'default',
})

const { t, locale } = useI18n()

useHead({
  title: computed(() => t('page.title')),
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-200px)] flex-col">
    <div
      class="
        border-b border-gray-200 bg-white
        dark:border-gray-800 dark:bg-elevated/50
      "
    >
      <UContainer
        class="
          py-4
          lg:py-8
        "
      >
        <UBreadcrumb
          :items="[
            { label: t('page.breadcrumb.home'), to: '/' },
            { label: t('page.breadcrumb.search'), to: '/search' },
            { label: t('page.breadcrumb.federated') },
          ]"
          class="mb-6"
        />

        <div class="mb-6">
          <h1
            class="
              mb-2 text-4xl font-bold text-gray-900
              dark:text-gray-100
            "
          >
            {{ t('page.title') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            {{ t('page.description') }}
          </p>
        </div>
      </UContainer>
    </div>

    <UContainer class="flex-1 py-8">
      <SearchFederatedSearchBar
        :language-code="locale"
        :limit="20"
        :placeholder="t('page.search_placeholder')"
      />
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  page:
    title: Ενοποιημένη Αναζήτηση
    description: Αναζήτηση σε προϊόντα και άρθρα με ενοποιημένη κατάταξη
    search_placeholder: Αναζήτηση προϊόντων και άρθρων...
    breadcrumb:
      home: Αρχική
      search: Αναζήτηση
      federated: Ενοποιημένη
</i18n>
