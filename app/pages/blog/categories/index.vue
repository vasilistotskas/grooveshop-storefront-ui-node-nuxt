<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('products'),
    label: t('breadcrumb.items.blog.categories.label'),
    current: true,
  },
])

useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <div class="mx-auto w-full max-w-(--container-main) !p-0">
      <UBreadcrumb
        :items="items"
        :ui="{
          item: 'text-primary-950 dark:text-primary-50',
          root: 'text-xs md:text-base',
        }"
        class="
          mb-5
          md:px-0
        "
      />
    </div>
    <BlogCategoriesList class="mx-auto max-w-(--container-main)" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορίες
  breadcrumb:
    items:
      blog:
        categories:
          label: Κατηγορίες
</i18n>
