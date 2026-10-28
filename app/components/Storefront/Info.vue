<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/Info')
const localePath = useLocalePath()

const { contentPage, pageTitle, pageBody, documentLocale, isFallback, fallbackLanguageName } = await useInfoPage()

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath({
      name: 'info-slug',
      params: { slug: contentPage.value?.slug ?? '' },
    }),
    label: pageTitle.value,
    current: true,
  },
])
</script>

<template>
  <PageWrapper class="flex flex-col">
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
      class="relative mb-5 min-w-0"
    />

    <PageTitle
      :text="pageTitle"
      class="mb-4"
    />

    <UAlert
      v-if="isFallback"
      color="neutral"
      variant="subtle"
      icon="i-heroicons-language"
      :title="t('document.fallbackNotice', { language: fallbackLanguageName })"
      class="mb-4"
    />

    <article
      :lang="documentLocale"
      class="
        article text-primary-950
        dark:text-primary-50
      "
    >
      <LazyBlogContent
        hydrate-never
        :html="pageBody"
      />
    </article>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  document:
    fallbackNotice: 'Το έγγραφο αυτό διατίθεται μόνο στα {language}.'
en:
  document:
    fallbackNotice: 'This document is available in {language} only.'
</i18n>
